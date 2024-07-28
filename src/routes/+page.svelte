<svelte:options immutable={true}/>

<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from "$lib/components/ui/button";

  // Group related variables
  let score = 0;
  let rollThickness = 0;
  let isSpinning = false;
  let center: { x: number; y: number } = { x: 0, y: 0 };
  let startAngle = 0;
  let paperLineY = 40 - rollThickness;
  let rotationSpeed = 0;
  let lastTimestamp = 0;

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

      // Start the animation loop
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

    const deltaTime = (timestamp - lastTimestamp) / 1000; // Convert to seconds
    lastTimestamp = timestamp;

    // Update rollThickness based on rotationSpeed
    rollThickness += rotationSpeed * deltaTime;

    // Apply friction to gradually decrease speed
    const friction = 2; // Adjust this value to change how quickly the roll slows down
    rotationSpeed *= Math.max(0, 1 - friction * deltaTime);

    // Ensure rollThickness stays within bounds
    if (rollThickness >= 20) {
      score += 1;
      rollThickness = 0;
      rotationSpeed = 0;
    } else if (rollThickness < 0) {
      rollThickness = 0;
      rotationSpeed = 0;
    }

    paperLineY = 40 - rollThickness;

    // Continue the animation loop
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
      const maxRotationSpeed = 10;

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

</script>

<main class="h-screen flex flex-col items-center justify-center bg-neutral-300 w-full"
      on:touchstart={handleTouchStart} 
      on:touchmove={handleTouchMove} 
      on:touchend={handleTouchEnd}
  >
  <div class="toilet-paper-roll relative w-full">
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><!-- Shadow -->
      <!-- Тень -->
      <ellipse cx={50} cy={90} rx={11 + rollThickness} ry={rollThickness * 0.06 + 1.2} fill="rgba(0,0,0,0.15)" />
      
      <!--  -->
      <line x1="0" y1={30 - paperLineY * 0.15} x2="50" y2="{paperLineY}" stroke="#fff" stroke-width="1" />
      
      <!-- Рулон бумаги -->
      <circle cx="50" cy="50" r="{10 + rollThickness}" fill="white" stroke="#fff" stroke-width="1" />
      
      <!-- Втулка -->
      <circle cx="50" cy="50" r="10" fill="rgb(212 212 212)" stroke="rgb(163 163 163)" stroke-width="2" />
    </svg>
  </div>
  <p class="text-2xl mb-4 text-gray-800">Счет: {score}</p>
</main>

<style>
  :global(body) { margin: 0; padding: 0; overflow: hidden; touch-action: none; }
  .toilet-paper-roll { touch-action: none; }
</style>