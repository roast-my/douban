<script lang="ts">
	import { onMount } from 'svelte';

	let { text, speed = 20, class: className = '' } = $props();
	
	let display = $state('');
    let completed = $state(false);

	onMount(() => {
		let i = 0;
        // speed is passed as prop, capture it here.
        const actualSpeed = speed; 

		const interval = setInterval(() => {
			if (i < text.length) {
				display += text[i];
				i++;
			} else {
                completed = true;
				clearInterval(interval);
			}
		}, actualSpeed);

		return () => clearInterval(interval);
	});
</script>

<div class={className}>
	<span>{display}</span>{#if !completed}<span class="animate-pulse font-bold inline-block ml-1">_</span>{/if}
</div>
