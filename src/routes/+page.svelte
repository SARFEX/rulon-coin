<svelte:options immutable={true}/>

<script lang="ts">
  import { onMount } from 'svelte';

  let roll: HTMLElement;
  let isReady = false;
  let score = 0;
  let rollThickness = 0;
  const maxRollThickness = 23;
  let isSpinning = false;
  let center: { x: number; y: number } = { x: 0, y: 0 };
  let startAngle = 0;
  let rotationSpeed = 0;
  let lastTimestamp = 0;
  let rotationAngle = 0;
  let foldLines = '';
  const maxRotationSpeed = 5;
  let isFullRoll = false;
  let showOnboarding = true;
  let tearProgress = 0;
  let isTearing = false;
  let isHolding = false;
  
  onMount(mount);
    
  async function mount() {
    const WebApp = (await import('@twa-dev/sdk')).default;
    
    WebApp.ready();
    WebApp.disableVerticalSwipes();
    WebApp.expand();
    
    isReady = true;
    console.info(WebApp.initData);

    createNewRoll();
    
    setTimeout(() => {
      updateCenter();
      requestAnimationFrame(updateRotation);
    }, 0);
    
    window.addEventListener('resize', updateCenter);

    return () => {
      window.removeEventListener('resize', updateCenter);
    };
  };

  function createNewRoll() {
    const minRadius = 10;
    const maxRadius = 10 + maxRollThickness;
    foldLines = createFoldLines(70, minRadius, maxRadius);
    rollThickness = 0;
    isFullRoll = false;
    isTearing = false;
    tearProgress = 0;
  }
  
  function updateCenter() {
    const rect = roll.getBoundingClientRect();
    center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  function updateRotation(timestamp: number) {
    if (lastTimestamp === 0) {
      lastTimestamp = timestamp;
    }

    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (!isTearing) {
      rollThickness += rotationSpeed * deltaTime;
    }
    rotationAngle += rotationSpeed * deltaTime * 60;
    rotationAngle %= 360;

    const friction = isHolding ? 10 : 2;
    rotationSpeed *= Math.max(0, 1 - friction * deltaTime);

    if (rollThickness >= maxRollThickness) {
      rollThickness = maxRollThickness;
      isFullRoll = true;
      isTearing = true;
    } else if (rollThickness < 0) {
      rollThickness = 0;
      rotationSpeed = 0;
    }

    if (isTearing) {
      tearProgress += Math.abs(rotationSpeed) * deltaTime * 1.0;
      if (tearProgress >= 1) tearProgress = 1;
    }

    // Check if onboarding should be hidden
    if (showOnboarding === true && rollThickness >= maxRollThickness * 0.1) {
      showOnboarding = false;
    }

    requestAnimationFrame(updateRotation);
  }

  function handleTouchStart(event: TouchEvent): void {
    try {
      isSpinning = true;
      isHolding = true;
      const touch = event.touches[0];
      if (!touch) throw new Error("No touch detected");
      startAngle = Math.atan2(touch.clientY - center.y, touch.clientX - center.x);
    }
    catch (error) {
      console.error("Error in handleTouchStart:", error);
      isSpinning = false;
      isHolding = false;
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
          rotationSpeed += deltaAngle * 0.3;
        } else {
          rotationSpeed = newRotationSpeed * Math.sign(deltaAngle);
        }
      }

      startAngle = currentAngle;
      isHolding = false;
    }
    catch (error) {
      console.error("Error in handleTouchMove:", error);
      isSpinning = false;
      isHolding = false;
    }
  }
  
  function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  function handleTouchEnd(): void { 
    isSpinning = false; 
    isHolding = false;
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

  function getPaperLinePath(isTearing: boolean, tearProgress: number, rollThickness: number): string {
    const startX = 0;
    const startY = 35;
    const centerX = 50;
    const centerY = 50;
    const radius = 10 + rollThickness;
    
    const angleOffset = Math.PI / 6;
    const touchAngle = Math.PI - angleOffset;
    
    const endX = centerX - radius * Math.sin(touchAngle)+ 2 ;
    const endY = centerY + radius * Math.cos(touchAngle) - 1;

    if (!isTearing) {
      const controlX = (startX + endX) / 2;
      const controlY = Math.min(startY, endY) + 6;
      return `M${startX} ${startY} Q${controlX} ${controlY} ${endX} ${endY}`;
    } else {
      const t = Math.min(1, tearProgress);
      const currentX = startX + (endX - startX) * t;
      const currentY = startY + (endY - startY) * t + (Math.sin(t * Math.PI) * 2);

      return `M${currentX} ${currentY} Q${endX} ${endY} ${endX} ${endY}`;
    }
  }
</script>

<main class:hidden={!isReady} class="h-screen flex flex-col items-center justify-center bg-neutral-300 w-full relative">
  <button
    class="absolute inset-0 w-full h-full opacity-0 cursor-default"
    aria-label="Игровая область"
    on:click={handleTap}
    on:touchstart={handleTouchStart}
    on:touchmove={handleTouchMove}
    on:touchend={handleTouchEnd}
    on:touchcancel={handleTouchEnd}
  ></button>
  <div bind:this={roll} class="relative w-full touch-none pointer-events-none">
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <!-- Shadow -->
      <ellipse cx={50} cy={90} rx={11 + rollThickness} ry={rollThickness * 0.06 + 1.2} fill="rgba(0,0,0,0.15)" />
      
      <!-- Paper line -->
      <path d={getPaperLinePath(isTearing, tearProgress, rollThickness)} stroke="white" stroke-width="0.5" stroke-linecap="round" fill="none" />
      
      <!-- Toilet paper roll -->
      <g transform={`rotate(${rotationAngle*10}, 50, 50)`}>
        <circle cx="50" cy="50" r="{10 + rollThickness}" fill="white" stroke="white" stroke-width="0.5" />
        
        <!-- Embossed effect -->
        <circle cx="50" cy="50" r="{10 + rollThickness}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1" />
        <circle cx="50" cy="50" r="{10 + rollThickness}" fill="none" stroke="rgba(0,0,0,0.07)" stroke-width="0.5" transform="translate(0.1,0.4)" />
        
        <!-- Маска для линий складок -->
        <mask id="foldLinesMask">
          <circle cx="0" cy="0" r="{10 + rollThickness}" fill="white" />
        </mask>
        
        <!-- Линии складок -->
        <g transform="translate(50, 50)">
          <path d={foldLines} stroke="rgba(0,0,0,0.06)" stroke-width="0.25" fill="none" mask="url(#foldLinesMask)" />
        </g>
      </g>
      
      <!-- Inner tube -->
      <circle cx="50" cy="50" r="10" fill="rgb(220, 220, 220)" stroke="rgb(180, 180, 180)" stroke-width="1" />
    </svg>
  </div>
  <p class="text-2xl mb-4 text-gray-800 touch-none pointer-events-none">Счет: {score}</p>
  
  {#if showOnboarding}
    <div class="finger-animation">
      <img src="/finger.png" alt="Палец" class="finger-animation2" />
    </div>
  {/if}
</main>

<style>
  :global(body) { margin: 0; padding: 0; overflow: hidden; touch-action: none; }

  .finger-animation {
    position: absolute;
    width: 70px;
    height: 70px;
    animation: moveFinger 2s infinite;
    top: -27%; bottom: 0;
    left: 27%; right: 0;
    margin: auto;
    transform-origin: -40% -40%;
    fill: #000;
    color: #000;
    pointer-events: none;
  }
  
  .finger-animation2 {
    width: 100%;
    height: 100%;
    animation: moveFinger2 2s infinite ease-in-out;
  }

  @keyframes moveFinger {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  @keyframes moveFinger2 {
    0% {
      transform: translateY(-100%);
    }
    100% {
      transform: translateY(100%);
    }
  }
</style>