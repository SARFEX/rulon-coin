<svelte:options immutable={true}/>

<script lang="ts">
  import { onMount } from 'svelte';

  let score = 0;
  let rollThickness = 0;
  const maxRollThickness = 23;
  let isSpinning = false;
  let center: { x: number; y: number } = { x: 0, y: 0 };
  let startAngle = 0;
  let paperLineY = 40 - rollThickness;
  let rotationSpeed = 0;
  let lastTimestamp = 0;
  let rotationAngle = 0;
  let foldLines = '';
  const maxRotationSpeed = 5;
  let isFullRoll = false;
  let lastDeltaAngle = 0;

  function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  onMount(() => {
    try {
      const roll = document.querySelector('.toilet-paper-roll');
      if (!roll) throw new Error("Toilet paper roll element not found");
      
      const updateCenter = () => {
        const rect = roll.getBoundingClientRect();
        center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      };

      updateCenter();
      window.addEventListener('resize', updateCenter);

      createNewRoll();
      requestAnimationFrame(updateRotation);

      return () => {
        window.removeEventListener('resize', updateCenter);
      };
    }
    catch (error) {
      console.error("Error in onMount:", error);
    }
  });

  function createNewRoll() {
    const minRadius = 10;
    const maxRadius = 10 + maxRollThickness;
    foldLines = createFoldLines(70, minRadius, maxRadius);
    rollThickness = 0;
    isFullRoll = false;
  }

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

    if (rollThickness >= maxRollThickness) {
      rollThickness = maxRollThickness;
      isFullRoll = true;
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
      lastDeltaAngle = 0;
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

      const currentAngle = Math.atan2(touch.clientY - center.y, touch.clientX - center.x);
      let deltaAngle = currentAngle - startAngle;
      
      if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

      const speedFactor = Math.min(distance / innerCircleRadius, 1);
      const angleSpeed = Math.min(Math.abs(deltaAngle) / (Math.PI * 0.1), 1);
      const newRotationSpeed = angleSpeed * speedFactor * maxRotationSpeed;
      
      if (newRotationSpeed > Math.abs(rotationSpeed)) {
        if (Math.sign(deltaAngle) !== Math.sign(rotationSpeed)) {
          // Плавное изменение направления
          rotationSpeed += deltaAngle * 0.3; // Коэффициент плавности
        } else {
          rotationSpeed = newRotationSpeed * Math.sign(deltaAngle);
        }
      }

      startAngle = currentAngle;
      lastDeltaAngle = deltaAngle;
    }
    catch (error) {
      console.error("Error in handleTouchMove:", error);
      isSpinning = false;
    }
  }

  function handleTouchEnd(): void { 
    isSpinning = false; 
  }

  function handleTap(): void {
    if (isFullRoll) {
      score += 1;
      createNewRoll();
    }
  }

  function createFoldLines(count: number, minRadius: number, maxRadius: number): string {
    let paths = '';
    const centerX = 0;
    const centerY = 0;
    const curveFactor = 0.3;

    for (let i = 0; i < count; i++) {
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const startAngle = Math.random() * Math.PI * 2;
      const len = Math.random() * 0.3 + 0.2;
      const arcLength = len * Math.PI;
      const endAngle = startAngle + arcLength;

      const startX = centerX + Math.cos(startAngle) * radius;
      const startY = centerY + Math.sin(startAngle) * radius;
      const endX = centerX + Math.cos(endAngle) * radius;
      const endY = centerY + Math.sin(endAngle) * radius;

      const midAngle = (startAngle + endAngle) / 2;
      const controlDistance = radius * (1 + Math.sin(arcLength / 2) * curveFactor);

      const controlX = centerX + Math.cos(midAngle) * controlDistance;
      const controlY = centerY + Math.sin(midAngle) * controlDistance;

      paths += `M${startX},${startY} Q${controlX},${controlY} ${endX},${endY} `;
    }

    return paths;
  }
</script>

<main class="h-screen flex flex-col items-center justify-center bg-neutral-300 w-full relative">
  <button
    class="absolute inset-0 w-full h-full opacity-0 cursor-default"
    aria-label="Игровая область"
    on:touchstart={handleTouchStart}
    on:touchmove={handleTouchMove}
    on:touchend={handleTouchEnd}
    on:click={handleTap}
  ></button>
  <div class="toilet-paper-roll relative w-full touch-none pointer-events-none">
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
        
        <!-- Маска для линий складок -->
        <mask id="foldLinesMask">
          <circle cx="0" cy="0" r="{10 + rollThickness}" fill="white" />
        </mask>
        
        <!-- Линии складок -->
        <g transform="translate(50, 50)">
          <path d={foldLines} stroke="rgba(0,0,0,0.07)" stroke-width="0.25" fill="none" mask="url(#foldLinesMask)" />
        </g>
      </g>
      
      <!-- Inner tube -->
      <circle cx="50" cy="50" r="10" fill="rgb(220, 220, 220)" stroke="rgb(180, 180, 180)" stroke-width="1" />
    </svg>
  </div>
  <p class="text-2xl mb-4 text-gray-800 touch-none pointer-events-none">Счет: {score}</p>
</main>

<style>
  :global(body) { margin: 0; padding: 0; overflow: hidden; touch-action: none; }
  .toilet-paper-roll { touch-action: none; }
</style>