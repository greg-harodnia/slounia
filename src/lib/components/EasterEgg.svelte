<script lang="ts">
	import { browser } from '$app/environment';

	let hidden = $state(false);
	let dodgeCount = $state(0);
	let dodgeX = $state(0);
	let dodgeY = $state(0);
	let dodgeActive = $state(false);
	let triggered = $state(false);

	$effect(() => {
		if (browser) {
			hidden = !!localStorage.getItem('egg_done');
		}
	});

	function dodge() {
		if (triggered) return;
		dodgeCount++;
		dodgeActive = true;
		dodgeX = (Math.random() - 0.5) * 260;
		dodgeY = (Math.random() - 0.5) * 60;
		if (dodgeCount >= 4) {
			setTimeout(() => {
				dodgeActive = false;
				dodgeCount = 0;
			}, 2000);
		}
	}

	function trigger() {
		if (triggered) return;
		triggered = true;
		dodgeActive = false;
		localStorage.setItem('egg_done', '1');
		disappearAll();
	}

	function disappearAll() {
		let count = 0;
		const iv = setInterval(() => {
			const all = Array.from(document.querySelectorAll('body *'))
				.filter((el): el is HTMLElement => el instanceof HTMLElement)
				.filter((el) => {
					const t = el.tagName;
					return (
						t !== 'SCRIPT' &&
						t !== 'STYLE' &&
						t !== 'LINK' &&
						t !== 'META' &&
						!el.classList.contains('egg-cat') &&
						el.style?.zIndex !== '9999' &&
						el.style?.zIndex !== '9998' &&
						el.style?.zIndex !== '9997'
					);
				});
			if (all.length === 0 || count > 300) {
				clearInterval(iv);
				showCat();
				return;
			}
			const el = all[Math.floor(Math.random() * all.length)];
			if (el?.parentNode) {
				el.remove();
				count++;
			}
		}, 60);
	}

	function showCat() {
		document.body.innerHTML = '';
		document.body.style.margin = '0';
		document.body.style.overflow = '';
		document.body.style.background = '#000';

		const wrap = document.createElement('div');
		wrap.className = 'egg-cat';
		wrap.style.cssText = `
			position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
			background:rgba(0,0,0,0.92);opacity:0;transition:opacity 0.6s ease;z-index:10000`;
		document.body.appendChild(wrap);

		const inner = document.createElement('div');
		inner.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2rem';
		wrap.appendChild(inner);

		const img = document.createElement('img');
		img.src = '/cat.gif';
		img.alt = 'loaf';
		img.style.cssText = 'width:min(80vw,500px);height:auto;border-radius:24px';
		inner.appendChild(img);

		const label = document.createElement('div');
		label.textContent = '';
		label.style.cssText = `
			font-size:2rem;font-weight:800;color:#ff4500;
			text-shadow:0 0 30px rgba(255,69,0,0.6);letter-spacing:0.15em;
			font-family:sans-serif`;
		inner.appendChild(label);

		label.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], {
			duration: 1200,
			iterations: Infinity,
			easing: 'ease-in-out',
		});

		requestAnimationFrame(() => {
			wrap.style.opacity = '1';
		});
	}
</script>

{#if !hidden}
	<button
		class="egg-btn"
		class:dodging={dodgeActive}
		onclick={trigger}
		onmouseenter={dodge}
		style={dodgeActive ? `transform: translate(${dodgeX}px, ${dodgeY}px)` : ''}>Переключиться на русский</button
	>
{/if}

<style>
	.egg-btn {
		all: unset;
		color: var(--c-text-muted);
		font-size: inherit;
		font-family: inherit;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color 0.15s;
	}
	.egg-btn:hover {
		color: var(--c-primary);
	}
	.egg-btn.dodging {
		transition: transform 0.15s ease;
		position: relative;
	}
</style>
