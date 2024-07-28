<svelte:options immutable={true}/>

<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from "$lib/components/ui/button";

  let score = 0;
  let rollThickness = 0;
  let isSpinning = false;
  let center: { x: number; y: number } = { x: 0, y: 0 };
  let startAngle = 0;
  let paperLineY = 40 - rollThickness;
  let rotationSpeed = 0;
  let lastTimestamp = 0;
  let rotationAngle = 0;

  function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  onMount(() => {
    try {
      const roll = document.querySelector('.toilet-paper-roll');
      if (!roll) throw new Error("Toilet paper roll element not found");
      
      function updateCenter() {
        const rect = roll.getBoundingClientRect();
        center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }

      updateCenter();
      window.addEventListener('resize', updateCenter);

      requestAnimationFrame(updateRotation);

      return () => {
        window.removeEventListener('resize', updateCenter);
      };
    }
    catch (error) {
      console.error("Error in onMount:", error);
    }
  });

  function updateRotation(timestamp: number) {
    if (lastTimestamp === 0) {
      lastTimestamp = timestamp;
    }

    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    rollThickness += rotationSpeed * deltaTime;
    rotationAngle += rotationSpeed * deltaTime * 60;
    rotationAngle %= 360;

    const friction = 2;
    rotationSpeed *= Math.max(0, 1 - friction * deltaTime);

    if (rollThickness >= 20) {
      score += 1;
      rollThickness = 0;
      rotationSpeed = 0;
    } else if (rollThickness < 0) {
      rollThickness = 0;
      rotationSpeed = 0;
    }

    paperLineY = 40 - rollThickness;

    requestAnimationFrame(updateRotation);
  }

  function handleTouchStart(event: TouchEvent): void {
    try {
      isSpinning = true;
      const touch = event.touches[0];
      if (!touch) throw new Error("No touch detected");
      startAngle = Math.atan2(touch.clientY - center.y, touch.clientX - center.x);
    }
    catch (error) {
      console.error("Error in handleTouchStart:", error);
      isSpinning = false;
    }
  }

  function handleTouchMove(event: TouchEvent): void {
    if (!isSpinning) return;
    
    try {
      const touch = event.touches[0];
      if (!touch) throw new Error("No touch detected");
      const distance = calculateDistance(center.x, center.y, touch.clientX, touch.clientY);
      const innerCircleRadius = window.innerWidth * 0.07;
      const maxRotationSpeed = 4;

      const currentAngle = Math.atan2(touch.clientY - center.y, touch.clientX - center.x);
      let deltaAngle = currentAngle - startAngle;
      
      if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

      const speedFactor = Math.min(distance / innerCircleRadius, 1);
      const angleSpeed = Math.min(Math.abs(deltaAngle) / (Math.PI * 0.1), 1);
      const newRotationSpeed = angleSpeed * speedFactor * maxRotationSpeed;
      
      if (newRotationSpeed > rotationSpeed) {
        rotationSpeed = newRotationSpeed;
      }

      if (deltaAngle < 0) {
        rotationSpeed = -rotationSpeed * 0.5;
      }

      startAngle = currentAngle;
    }
    catch (error) {
      console.error("Error in handleTouchMove:", error);
      isSpinning = false;
    }
  }

  function handleTouchEnd(): void { 
    isSpinning = false; 
  }

  function createFoldLines(count: number, rollThickness: number): string {
    let paths = '';
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x1 = 50 + Math.cos(angle) * 10;
      const y1 = 50 + Math.sin(angle) * 10;
      const x2 = 50 + Math.cos(angle) * (10 + rollThickness);
      const y2 = 50 + Math.sin(angle) * (10 + rollThickness);
      paths += `M${x1},${y1} L${x2},${y2} `;
    }
    return paths;
  }

</script>

<main class="h-screen flex flex-col items-center justify-center bg-neutral-300 w-full"
      on:touchstart={handleTouchStart} 
      on:touchmove={handleTouchMove} 
      on:touchend={handleTouchEnd}
  >
  <div class="toilet-paper-roll relative w-full">
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <!-- Shadow -->
      <ellipse cx={50} cy={90} rx={11 + rollThickness} ry={rollThickness * 0.06 + 1.2} fill="rgba(0,0,0,0.15)" />
      
      <!-- Paper line -->
      <line x1="0" y1={35 - paperLineY * 0.2} x2="50" y2="{paperLineY-0.05}" stroke="#fff" stroke-width="0.5" />
      
      <!-- Toilet paper roll -->
      <g transform={`rotate(${rotationAngle*10}, 50, 50)`}>
        <circle cx="50" cy="50" r="{10 + rollThickness}" fill="#fff" stroke="#fff" stroke-width="0.5" />
        
        <!-- Embossed effect -->
        <circle cx="50" cy="50" r="{10 + rollThickness}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1" />
        <circle cx="50" cy="50" r="{10 + rollThickness}" fill="none" stroke="rgba(0,0,0,0.07)" stroke-width="0.5" transform="translate(0.1,0.4)" />
        
        <!-- Fold lines -->
        <!-- <path d={createFoldLines(6, rollThickness)} stroke="rgba(0,0,0,0.05)" stroke-width="3" fill="none" /> -->
        
      </g>
      
      <!-- Inner tube -->
      <circle cx="50" cy="50" r="10" fill="rgb(220, 220, 220)" stroke="rgb(180, 180, 180)" stroke-width="1" />
    </svg>
  </div>
  <p class="text-2xl mb-4 text-gray-800">Счет: {score}</p>
</main>

<style>
  :global(body) { margin: 0; padding: 0; overflow: hidden; touch-action: none; }
  .toilet-paper-roll { touch-action: none; }
</style>