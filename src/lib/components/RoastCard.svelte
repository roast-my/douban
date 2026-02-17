<script lang="ts">
  import {toPng} from 'html-to-image';

  let {result} = $props();

  function getDiagnosisRate(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const random = (Math.abs(hash) % 1000) / 1000;
    return (90 + random * 9.9).toFixed(1);
  }

  let diagnosisRate = $derived(getDiagnosisRate(result.roast || ''));

  // Radar Chart Logic
  const axes = ['文艺', '现充', '遗老', '致郁', '死宅'];
  const keys = ['pretentiousness', 'mainstream', 'nostalgia', 'darkness', 'geekiness'];

  const radius = 80;
  const center = 100;
  const angleStep = (Math.PI * 2) / 5;

  function getPoint(index: number, value: number) {
    const angle = -Math.PI / 2 + index * angleStep;
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }

  // Determine polygon points
  let points = $derived(
    keys
      .map((key, i) => {
        const value = result.scores[key] || 0;
        return getPoint(i, value);
      })
      .join(' '),
  );

  // Tooltip Logic
  let hoveredAxisIndex = $state<number | null>(null);

  const axisDefinitions = [
    {
      title: 'pretentiousness (装 X 值 / 逼格)',
      meaning: '看了多少晦涩难懂、高分冷门、哲学、纪录片、古典乐、实验电影。',
      high: '塔尔科夫斯基、《尤利西斯》、古尔德。',
      low: '漫威、爽文、抖音神曲。',
    },
    {
      title: 'mainstream (从众度 / 现充值)',
      meaning: '与当下流行趋势的重合度。是不是只看 Top 250？是不是什么火看什么？',
      high: '贾玲、《三体》、周杰伦、霉霉。',
      low: '只有几百人标记的冷门B级片、地下乐队。',
    },
    {
      title: 'nostalgia (怀旧值 / 遗老度)',
      meaning: '内容的时间跨度。',
      high: '喜爱黑白片、80/90年代港片、经典文学、老摇滚。',
      low: '追新番、追当季美剧、看网络小说。',
    },
    {
      title: 'darkness (致郁度 / 阴暗值)',
      meaning: '内容的情绪色彩。包括恐怖、惊悚、悲剧、致郁系、重金属、犯罪。',
      high: '《熔炉》、伊藤润二、太宰治、后摇。',
      low: '喜剧、合家欢、励志书、正能量。',
    },
    {
      title: 'geekiness (死宅值 / 浓度)',
      meaning: '替代原来的 acg，但范围更广。包含科幻、奇幻、动漫、游戏改编、硬核推理。',
      high: '赛博朋克、高达、魔戒、克苏鲁、硬科幻。',
      low: '现实主义题材、生活剧、职场书。',
    },
  ];

  function getTooltipStyle(index: number) {
    const p = getPoint(index, 115).split(',');
    const x = parseFloat(p[0]);
    const y = parseFloat(p[1]);
    // Convert 200x200 coordinate system to percentage
    return `left: ${x / 2}%; top: ${y / 2}%;`;
  }

  function getTooltipClass(index: number) {
    if (index === 0) return '-translate-x-1/2 -translate-y-full -mt-2'; // Top
    if (index === 1 || index === 2) return 'translate-x-2 -translate-y-1/2'; // Right
    return '-translate-x-full -translate-x-2 -translate-y-1/2'; // Left (3, 4)
  }

  let cardElement: HTMLElement;
  let isExporting = $state(false);

  async function handleShare() {
    if (!cardElement || isExporting) return;
    isExporting = true;

    try {
      const dataUrl = await toPng(cardElement, {
        cacheBust: true,
        pixelRatio: 2, // High resolution
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `roast-my-douban-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('图片导出失败，请重试');
    } finally {
      isExporting = false;
    }
  }
</script>

<div class="w-full mx-auto">
  <div
    bind:this={cardElement}
    class="bg-white border-2 border-[#007722] shadow-[8px_8px_0px_0px_rgba(0,119,34,0.2)] p-5 md:p-8 w-full mx-auto text-slate-800 font-sans relative group"
  >
    <div class="relative z-20">
      <header class="border-b-2 border-[#007722]/20 pb-4 mb-8 flex justify-between items-end">
        <div>
          <h2 class="text-xs text-[#007722]/70 uppercase tracking-widest mb-1">诊断对象 ID</h2>
          <h1 class="text-3xl font-bold font-sans text-[#007722] uppercase tracking-tighter">{result.archetype}</h1>
        </div>
        <div class="text-right">
          <span class="text-xs text-[#007722]/50 block">确诊率</span>
          <span class="text-xl font-bold text-[#007722]">{diagnosisRate}%</span>
        </div>
      </header>

      <!-- Flex Container for Chart + Tags -->
      <div class="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-24 mb-8 relative">
        <!-- Radar Chart -->
        <div class="relative flex-shrink-0">
          <svg
            width="180"
            height="180"
            viewBox="0 0 200 200"
            class="overflow-visible"
          >
            <!-- Grid backgrounds (circles) -->
            {#each [20, 40, 60, 80, 100] as level}
              <polygon
                points={keys.map((_, i) => getPoint(i, level)).join(' ')}
                fill="none"
                stroke="#007722"
                stroke-width="1"
                class="opacity-10"
              />
            {/each}

            <!-- Axes lines -->
            {#each keys as _, i}
              <line
                x1={center}
                y1={center}
                x2={getPoint(i, 100).split(',')[0]}
                y2={getPoint(i, 100).split(',')[1]}
                stroke="#007722"
                stroke-width="1"
                class="opacity-20"
              />
              <!-- Labels -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <text
                x={parseFloat(getPoint(i, 115).split(',')[0])}
                y={parseFloat(getPoint(i, 115).split(',')[1])}
                text-anchor="middle"
                dominant-baseline="middle"
                class="text-[10px] fill-[#007722] font-bold cursor-help hover:opacity-75 transition-opacity"
                onmouseenter={() => (hoveredAxisIndex = i)}
                onmouseleave={() => (hoveredAxisIndex = null)}
              >
                {axes[i]}
              </text>
            {/each}

            <!-- Data Polygon -->
            <polygon
              {points}
              fill="rgba(0, 119, 34, 0.1)"
              stroke="#007722"
              stroke-width="2"
            />

            <!-- Data Points -->
            {#each keys as key, i}
              <circle
                cx={getPoint(i, result.scores[key] || 0).split(',')[0]}
                cy={getPoint(i, result.scores[key] || 0).split(',')[1]}
                r="3"
                fill="#007722"
              />
            {/each}
          </svg>
          
          <!-- Tooltip (Absolute Positioned relative to svg container) -->
          {#if hoveredAxisIndex !== null && !isExporting}
            <div
              class="absolute bg-white/95 backdrop-blur-sm border border-[#007722]/20 shadow-xl rounded-lg p-4 w-68 z-[100] text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-200 transform {getTooltipClass(hoveredAxisIndex)}"
              style={getTooltipStyle(hoveredAxisIndex)}
            >
              <h3 class="font-bold text-[#007722] mb-2">{axisDefinitions[hoveredAxisIndex].title}</h3>
              <div class="space-y-2 text-slate-600">
                <p><span class="font-bold text-[#007722]/70">含义:</span> {axisDefinitions[hoveredAxisIndex].meaning}</p>
                <p><span class="font-bold text-[#007722]/70">高分:</span> {axisDefinitions[hoveredAxisIndex].high}</p>
                <p><span class="font-bold text-[#007722]/70">低分:</span> {axisDefinitions[hoveredAxisIndex].low}</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Tags (Right on Desktop) -->
        <div class="flex flex-wrap md:flex-col justify-center md:justify-center gap-3 max-w-[280px] md:max-w-[140px]">
          {#each result.tags as tag}
            <span
              class="px-3 py-1.5 flex items-center justify-center bg-[#007722]/5 border border-[#007722]/30 text-xs text-[#007722] rounded-full uppercase tracking-wider font-bold whitespace-nowrap"
            >
              {tag}
            </span>
          {/each}
        </div>
      </div>


      <!-- Roast Text -->
      <div class="relative px-2 -mx-3 md:mx-0">
        <div class="absolute -left-1 -top-4 text-4xl text-[#007722] opacity-20 font-serif">"</div>
        <p class="leading-relaxed text-slate-600 italic text-center font-serif text-sm md:text-base">
          {result.roast}
        </p>
        <div class="absolute -right-1 -bottom-4 text-4xl text-[#007722] opacity-20 font-serif">"</div>
      </div>
    </div>
  </div>

  <footer class="flex items-center justify-center gap-4 py-4 mt-4 ">
    <button
      onclick={() => window.location.reload()}
      class="px-6 py-2 bg-[#007722]/10 hover:bg-[#007722]/20 text-[#007722] font-bold uppercase tracking-wider text-sm transition-colors rounded-sm"
    >
      <svg
        class="inline"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      回到主页
    </button>

    <button
      onclick={handleShare}
      disabled={isExporting}
      class="px-6 py-2 bg-[#007722] hover:bg-[#006611] text-white font-bold uppercase tracking-wider text-sm transition-colors shadow-lg active:translate-y-1 active:shadow-none rounded-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
    >
      {isExporting ? '生成中...' : '分享诊断单'}
    </button>
  </footer>
</div>
