<script lang="ts">
  import '../app.css';
  import {injectAnalytics} from '@vercel/analytics/sveltekit';

  let {children} = $props();

  injectAnalytics();
</script>

<svelte:head>
  <meta
    name="referrer"
    content="no-referrer"
  />
</svelte:head>

{@render children()}
