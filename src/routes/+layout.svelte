<script lang="ts">
  import '../app.css';
  import {injectAnalytics} from '@vercel/analytics/sveltekit';

  let {children} = $props();

  injectAnalytics();
</script>

<svelte:head>
  <meta name="referrer" content="no-referrer" />
  <title>Roast My Douban | 豆瓣标记精神状态分析</title>
  <meta name="description" content="输入豆瓣 ID，让 AI 深度侧写你的精神状态。支持书籍、电影、音乐分析。" />
  <meta name="keywords" content="豆瓣, Douban, AI, Roast, 精神状态, 年度报告, LLM, 吐槽" />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://rmd.aeriszhu.com/" />
  <meta property="og:title" content="Roast My Douban | 豆瓣标记精神状态分析" />
  <meta property="og:description" content="输入豆瓣 ID，让 AI 深度侧写你的精神状态。" />
  <meta property="og:image" content="https://rmd.aeriszhu.com/douban_new.webp" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="https://rmd.aeriszhu.com/" />
  <meta property="twitter:title" content="Roast My Douban | 豆瓣标记精神状态分析" />
  <meta property="twitter:description" content="输入豆瓣 ID，让 AI 深度侧写你的精神状态。" />
  <meta property="twitter:image" content="https://rmd.aeriszhu.com/douban_new.webp" />
</svelte:head>

{@render children()}
