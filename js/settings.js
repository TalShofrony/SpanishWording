function initSettings() {
  // Direction
  const dir = getDirection();
  const radios = $$('input[name="direction"]');
  radios.forEach(r => {
    r.checked = r.value === dir;
    r.onchange = () => {
      localStorage.setItem('sw-direction', r.value);
    };
  });

  // Distribution sliders
  const dist = getDistribution();
  const keys = ['1', '2', '3', '4'];
  keys.forEach((k, i) => {
    const slider = $(`#dist-slider-${i + 1}`);
    const valEl = $(`#dist-val-${i + 1}`);
    slider.value = dist[k];
    valEl.textContent = `${dist[k]}%`;

    slider.oninput = () => handleSliderChange(i, keys);
  });

  updateDistTotal(keys);
}

function handleSliderChange(changedIdx, keys) {
  const sliders = keys.map((_, i) => $(`#dist-slider-${i + 1}`));
  const values = sliders.map(s => parseInt(s.value));

  const changedVal = values[changedIdx];
  const remaining = 100 - changedVal;
  const othersSum = values.reduce((s, v, i) => i === changedIdx ? s : s + v, 0);

  if (othersSum === 0) {
    // Distribute remaining equally
    const each = Math.floor(remaining / (keys.length - 1));
    let leftover = remaining - each * (keys.length - 1);
    values.forEach((_, i) => {
      if (i !== changedIdx) {
        values[i] = each + (leftover > 0 ? 1 : 0);
        if (leftover > 0) leftover--;
      }
    });
  } else {
    // Scale others proportionally
    const scale = remaining / othersSum;
    let assigned = 0;
    const otherIdxs = keys.map((_, i) => i).filter(i => i !== changedIdx);
    otherIdxs.forEach((i, idx) => {
      if (idx === otherIdxs.length - 1) {
        values[i] = remaining - assigned; // last one gets remainder
      } else {
        values[i] = Math.round(values[i] * scale);
        assigned += values[i];
      }
    });
  }

  // Update DOM + save
  const dist = {};
  keys.forEach((k, i) => {
    const slider = $(`#dist-slider-${i + 1}`);
    const valEl = $(`#dist-val-${i + 1}`);
    slider.value = values[i];
    valEl.textContent = `${values[i]}%`;
    dist[k] = values[i];
  });

  localStorage.setItem('sw-distribution', JSON.stringify(dist));
  updateDistTotal(keys);
}

function updateDistTotal(keys) {
  const sum = keys.reduce((s, _, i) => s + parseInt($(`#dist-slider-${i + 1}`).value), 0);
  const el = $('#dist-total');
  el.textContent = `Total: ${sum}%`;
  el.classList.toggle('invalid', sum !== 100);
}
