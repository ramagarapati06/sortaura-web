/* ═══════════════════════════════════════════════════════════
   SORTAURA — script.js
   Sorting Visualizer  •  Vanilla JS  •  Async/Await
   ═══════════════════════════════════════════════════════════ */

// ─── STATE ────────────────────────────────────────────────
let array        = [];          // current working array
let steps        = [];          // pre-computed animation steps
let stepIndex    = 0;           // current step pointer
let isSorting    = false;       // are we auto-playing?
let isPaused     = false;       // is it paused?
let stepMode     = false;       // step-by-step mode flag
let comparisons  = 0;
let swaps        = 0;
let startTime    = null;
let timerInterval = null;
let selectedAlgo = 'bubble';
let arrayType    = 'random';
let animationId  = null;        // for cancelling

// ─── DOM REFS ─────────────────────────────────────────────
const vizArea        = document.getElementById('vizArea');
const btnGenerate    = document.getElementById('btnGenerate');
const btnStart       = document.getElementById('btnStart');
const btnPause       = document.getElementById('btnPause');
const btnStep        = document.getElementById('btnStep');
const btnReset       = document.getElementById('btnReset');
const sizeSlider     = document.getElementById('sizeSlider');
const speedSlider    = document.getElementById('speedSlider');
const sizeVal        = document.getElementById('sizeVal');
const speedVal       = document.getElementById('speedVal');
const statComparisons = document.getElementById('statComparisons');
const statSwaps      = document.getElementById('statSwaps');
const statSize       = document.getElementById('statSize');
const statTime       = document.getElementById('statTime');
const expTitle       = document.getElementById('expTitle');
const expText        = document.getElementById('expText');
const statusPill     = document.getElementById('statusPill');
const currentAlgoLabel = document.getElementById('currentAlgoLabel');
const algoItems      = document.querySelectorAll('.algo-item');
const typeButtons    = document.querySelectorAll('.type-btn');
const hamburger      = document.getElementById('hamburger');
const sidebar        = document.getElementById('sidebar');

// ─── ALGO METADATA ────────────────────────────────────────
const algoMeta = {
  bubble:    { label: 'Bubble Sort'    },
  selection: { label: 'Selection Sort' },
  insertion: { label: 'Insertion Sort' },
  quick:     { label: 'Quick Sort'     },
  merge:     { label: 'Merge Sort'     },
};

// ─── INIT ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  generateArray();
  bindEvents();
});

// ─── EVENT BINDINGS ───────────────────────────────────────
function bindEvents() {

  // Algorithm selection
  algoItems.forEach(item => {
    item.addEventListener('click', () => {
      if (isSorting) return;
      algoItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      selectedAlgo = item.dataset.algo;
      currentAlgoLabel.textContent = algoMeta[selectedAlgo].label;
      resetState();
      generateArray();

      // Close sidebar on mobile after selection
      if (window.innerWidth <= 820) closeSidebar();
    });
  });

  // Array type
  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (isSorting) return;
      typeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      arrayType = btn.dataset.type;
      generateArray();
      if (window.innerWidth <= 820) closeSidebar();
    });
  });

  // Controls
  btnGenerate.addEventListener('click', () => {
    if (isSorting && !isPaused) return;
    resetState();
    generateArray();
  });

  btnStart.addEventListener('click', startSorting);
  btnPause.addEventListener('click', togglePause);
  btnStep.addEventListener('click', doNextStep);
  btnReset.addEventListener('click', () => { resetState(); generateArray(); });

  // Sliders
  sizeSlider.addEventListener('input', () => {
    if (isSorting && !isPaused) return;
    sizeVal.textContent = sizeSlider.value;
    resetState();
    generateArray();
  });

  speedSlider.addEventListener('input', () => {
    speedVal.textContent = speedSlider.value;
  });

  // Mobile hamburger
  hamburger.addEventListener('click', toggleSidebar);

  // Overlay click closes sidebar
  document.querySelector('.sidebar-overlay') ||
    document.body.insertAdjacentHTML('beforeend', '<div class="sidebar-overlay" id="sidebarOverlay"></div>');
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
}

// ─── SIDEBAR MOBILE ───────────────────────────────────────
function toggleSidebar() {
  sidebar.classList.toggle('open');
  hamburger.classList.toggle('open');
  const overlay = document.getElementById('sidebarOverlay');
  overlay.classList.toggle('visible');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  hamburger.classList.remove('open');
  const overlay = document.getElementById('sidebarOverlay');
  overlay.classList.remove('visible');
}

// ─── ARRAY GENERATION ─────────────────────────────────────
function generateArray() {
  const n = parseInt(sizeSlider.value);
  array = [];

  if (arrayType === 'random') {
    // Fully random values between 10 and 100
    for (let i = 0; i < n; i++) array.push(randInt(10, 100));

  } else if (arrayType === 'nearly') {
    // Sorted with a few random swaps (~10%)
    for (let i = 0; i < n; i++) array.push(Math.round(10 + (i / n) * 90));
    const swapCount = Math.floor(n * 0.1);
    for (let i = 0; i < swapCount; i++) {
      const a = randInt(0, n - 1), b = randInt(0, n - 1);
      [array[a], array[b]] = [array[b], array[a]];
    }

  } else if (arrayType === 'reverse') {
    // Fully reverse sorted
    for (let i = 0; i < n; i++) array.push(Math.round(10 + ((n - 1 - i) / n) * 90));
  }

  statSize.textContent = n;
  renderBars(array, [], [], [], []);
  setExplanation('Ready to sort', `Array of <strong>${n}</strong> elements generated. Press <strong>Start</strong> to begin.`);
}

// ─── RENDER BARS ──────────────────────────────────────────
/**
 * Renders the bar chart.
 * @param {number[]} arr         - the current array values
 * @param {number[]} comparing   - indices being compared (yellow)
 * @param {number[]} swapping    - indices being swapped (rose)
 * @param {number[]} pivotIdx    - pivot index (lavender)
 * @param {number[]} sorted      - fully sorted indices (green)
 */
function renderBars(arr, comparing = [], swapping = [], pivotIdx = [], sorted = []) {
  const max = Math.max(...arr);
  vizArea.innerHTML = '';

  arr.forEach((val, i) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${(val / max) * 100}%`;

    if (sorted.includes(i))       bar.classList.add('sorted');
    else if (swapping.includes(i)) bar.classList.add('swapping');
    else if (comparing.includes(i)) bar.classList.add('comparing');
    else if (pivotIdx.includes(i)) bar.classList.add('pivot');

    // Tooltip with value
    bar.title = val;
    vizArea.appendChild(bar);
  });
}

// ─── EXPLANATION ──────────────────────────────────────────
function setExplanation(title, text) {
  expTitle.textContent = title;
  expText.innerHTML = text;
}

// ─── STATUS PILL ──────────────────────────────────────────
function setStatus(s) {
  statusPill.textContent = s;
  statusPill.className = 'status-pill';
  if (s === 'Sorting') statusPill.classList.add('running');
  else if (s === 'Done!') statusPill.classList.add('done');
  else if (s === 'Paused') statusPill.classList.add('paused');
}

// ─── RESET STATE ──────────────────────────────────────────
function resetState() {
  isSorting = false;
  isPaused  = false;
  stepMode  = false;
  steps     = [];
  stepIndex = 0;
  comparisons = 0;
  swaps     = 0;
  clearInterval(timerInterval);
  startTime = null;

  statComparisons.textContent = '0';
  statSwaps.textContent       = '0';
  statTime.textContent        = '0ms';

  setStatus('Ready');
  setExplanation('Ready to sort', 'Press <strong>Start</strong> to begin, or use <strong>Step</strong> to go one step at a time.');

  // Button states
  btnStart.disabled    = false;
  btnPause.disabled    = true;
  btnStep.disabled     = false;
  btnReset.disabled    = true;
  btnGenerate.disabled = false;
  sizeSlider.disabled  = false;
}

// ─── COMPUTE STEPS ────────────────────────────────────────
/**
 * Run the selected algorithm and collect every visual step
 * into the `steps` array. No DOM changes here — pure logic.
 */
function computeSteps() {
  const arr = [...array]; // working copy
  steps = [];

  switch (selectedAlgo) {
    case 'bubble':    bubbleSortSteps(arr);    break;
    case 'selection': selectionSortSteps(arr); break;
    case 'insertion': insertionSortSteps(arr); break;
    case 'quick':     quickSortSteps(arr, 0, arr.length - 1); break;
    case 'merge':     mergeSortSteps(arr, 0, arr.length - 1); break;
  }

  // Final "all sorted" step
  steps.push({
    arr: [...arr],
    comparing: [],
    swapping:  [],
    pivot:     [],
    sorted:    arr.map((_, i) => i),
    msg: ['All Done! ✓', 'All elements are in their correct positions. The array is fully sorted.'],
  });
}

// ─── STEP HELPERS ─────────────────────────────────────────
function addStep(arr, comparing, swapping, pivot, sorted, msg) {
  steps.push({
    arr: [...arr],
    comparing: [...comparing],
    swapping:  [...swapping],
    pivot:     [...pivot],
    sorted:    [...sorted],
    msg,
  });
}

// ─── BUBBLE SORT ──────────────────────────────────────────
function bubbleSortSteps(arr) {
  const n = arr.length;
  const sorted = [];

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      // Step: comparing j and j+1
      addStep(arr, [j, j + 1], [], [], sorted,
        ['Comparing', `Comparing <strong>${arr[j]}</strong> and <strong>${arr[j+1]}</strong> — are they in the wrong order?`]);
      comparisons++;

      if (arr[j] > arr[j + 1]) {
        // Step: swapping
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swaps++;
        addStep(arr, [], [j, j + 1], [], sorted,
          ['Swapping', `<strong>${arr[j+1]}</strong> was larger — swapped with <strong>${arr[j]}</strong>.`]);
      }
    }
    sorted.unshift(n - 1 - i);
    addStep(arr, [], [], [], sorted,
      ['Element placed', `Position <strong>${n - 1 - i}</strong> is now sorted.`]);
  }
  sorted.unshift(0);
}

// ─── SELECTION SORT ───────────────────────────────────────
function selectionSortSteps(arr) {
  const n = arr.length;
  const sorted = [];

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    addStep(arr, [], [], [minIdx], sorted,
      ['Finding minimum', `Searching for the smallest element from index <strong>${i}</strong> onwards.`]);

    for (let j = i + 1; j < n; j++) {
      addStep(arr, [minIdx, j], [], [], sorted,
        ['Comparing', `Is <strong>${arr[j]}</strong> smaller than current min <strong>${arr[minIdx]}</strong>?`]);
      comparisons++;

      if (arr[j] < arr[minIdx]) {
        minIdx = j;
        addStep(arr, [], [], [minIdx], sorted,
          ['New minimum', `Found new minimum: <strong>${arr[minIdx]}</strong> at index <strong>${minIdx}</strong>.`]);
      }
    }

    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
      swaps++;
      addStep(arr, [], [i, minIdx], [], sorted,
        ['Swapping', `Placed <strong>${arr[i]}</strong> at position <strong>${i}</strong>.`]);
    }

    sorted.push(i);
    addStep(arr, [], [], [], sorted,
      ['Element placed', `Position <strong>${i}</strong> is now sorted.`]);
  }
  sorted.push(n - 1);
}

// ─── INSERTION SORT ───────────────────────────────────────
function insertionSortSteps(arr) {
  const n = arr.length;
  const sorted = [0];

  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;

    addStep(arr, [i], [], [], sorted,
      ['Picking element', `Inserting <strong>${key}</strong> into the sorted portion.`]);

    while (j >= 0 && arr[j] > key) {
      addStep(arr, [j, j + 1], [], [], sorted,
        ['Shifting', `<strong>${arr[j]}</strong> is larger — shifting it right.`]);
      comparisons++;
      arr[j + 1] = arr[j];
      swaps++;
      addStep(arr, [], [j, j + 1], [], sorted,
        ['Shifted', `Moved <strong>${arr[j]}</strong> one position to the right.`]);
      j--;
    }

    arr[j + 1] = key;
    sorted.push(i);
    addStep(arr, [], [], [], sorted,
      ['Inserted', `<strong>${key}</strong> placed at position <strong>${j + 1}</strong>.`]);
  }
}

// ─── QUICK SORT ───────────────────────────────────────────
function quickSortSteps(arr, low, high, sorted = []) {
  if (low < high) {
    const pi = partitionSteps(arr, low, high, sorted);
    quickSortSteps(arr, low, pi - 1, sorted);
    quickSortSteps(arr, pi + 1, high, sorted);
  } else if (low === high) {
    sorted.push(low);
    addStep(arr, [], [], [], sorted,
      ['Element in place', `<strong>${arr[low]}</strong> is already in its correct position.`]);
  }
}

function partitionSteps(arr, low, high, sorted) {
  const pivot = arr[high];
  addStep(arr, [], [], [high], sorted,
    ['Pivot selected', `Pivot is <strong>${pivot}</strong> (last element of subarray).`]);

  let i = low - 1;

  for (let j = low; j < high; j++) {
    addStep(arr, [j, high], [], [high], sorted,
      ['Comparing with pivot', `Is <strong>${arr[j]}</strong> ≤ pivot <strong>${pivot}</strong>?`]);
    comparisons++;

    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      swaps++;
      addStep(arr, [], [i, j], [high], sorted,
        ['Swapping', `<strong>${arr[i]}</strong> ≤ pivot, moved to left partition.`]);
    }
  }

  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  swaps++;
  sorted.push(i + 1);
  addStep(arr, [], [i + 1, high], [], sorted,
    ['Pivot placed', `Pivot <strong>${pivot}</strong> is now in its correct position at index <strong>${i + 1}</strong>.`]);

  return i + 1;
}

// ─── MERGE SORT ───────────────────────────────────────────
function mergeSortSteps(arr, left, right, sorted = []) {
  if (left >= right) return;
  const mid = Math.floor((left + right) / 2);

  addStep(arr, [], [], [], sorted,
    ['Dividing', `Splitting subarray [${left}…${right}] at midpoint <strong>${mid}</strong>.`]);

  mergeSortSteps(arr, left, mid, sorted);
  mergeSortSteps(arr, mid + 1, right, sorted);
  mergeSteps(arr, left, mid, right, sorted);
}

function mergeSteps(arr, left, mid, right, sorted) {
  const leftArr  = arr.slice(left, mid + 1);
  const rightArr = arr.slice(mid + 1, right + 1);

  addStep(arr, [], [], [], sorted,
    ['Merging', `Merging subarrays [${left}…${mid}] and [${mid+1}…${right}].`]);

  let i = 0, j = 0, k = left;

  while (i < leftArr.length && j < rightArr.length) {
    comparisons++;
    addStep(arr, [left + i, mid + 1 + j], [], [], sorted,
      ['Comparing', `Comparing <strong>${leftArr[i]}</strong> vs <strong>${rightArr[j]}</strong>.`]);

    if (leftArr[i] <= rightArr[j]) {
      arr[k] = leftArr[i++];
    } else {
      arr[k] = rightArr[j++];
      swaps++;
    }
    addStep(arr, [], [k], [], sorted,
      ['Placing', `Placed <strong>${arr[k]}</strong> at position <strong>${k}</strong>.`]);
    k++;
  }

  while (i < leftArr.length) {
    arr[k] = leftArr[i++];
    addStep(arr, [], [k], [], sorted,
      ['Copying', `Copying remaining element <strong>${arr[k]}</strong>.`]);
    k++;
  }

  while (j < rightArr.length) {
    arr[k] = rightArr[j++];
    addStep(arr, [], [k], [], sorted,
      ['Copying', `Copying remaining element <strong>${arr[k]}</strong>.`]);
    k++;
  }

  // Mark merged range as sorted-ish (light visual feedback)
  for (let x = left; x <= right; x++) {
    if (!sorted.includes(x)) sorted.push(x);
  }
  addStep(arr, [], [], [], sorted,
    ['Merged', `Subarray [${left}…${right}] is now merged and sorted.`]);
}

// ─── START SORTING ────────────────────────────────────────
async function startSorting() {
  if (isSorting && !isPaused) return;

  // If resuming from pause
  if (isPaused) {
    isPaused = false;
    setStatus('Sorting');
    btnPause.textContent = '⏸ Pause';
    btnPause.disabled = false;
    await playSteps();
    return;
  }

  // Fresh start
  resetCounters();
  computeSteps();

  isSorting  = true;
  isPaused   = false;
  stepMode   = false;
  startTime  = Date.now();

  startTimer();
  setStatus('Sorting');

  btnStart.disabled    = true;
  btnPause.disabled    = false;
  btnStep.disabled     = true;
  btnReset.disabled    = true;
  btnGenerate.disabled = true;
  sizeSlider.disabled  = true;

  await playSteps();
}

function resetCounters() {
  comparisons = 0;
  swaps       = 0;
  stepIndex   = 0;
  statComparisons.textContent = '0';
  statSwaps.textContent       = '0';
}

// ─── PLAY STEPS (AUTO) ────────────────────────────────────
async function playSteps() {
  while (stepIndex < steps.length) {
    if (isPaused || stepMode) return;

    applyStep(steps[stepIndex]);
    stepIndex++;

    await sleep(getDelay());
  }

  // Finished naturally
  if (!isPaused) finishSorting();
}

// ─── APPLY ONE STEP ───────────────────────────────────────
function applyStep(step) {
  renderBars(step.arr, step.comparing, step.swapping, step.pivot, step.sorted);
  setExplanation(step.msg[0], step.msg[1]);

  // Update live stats (they were tracked during step generation)
  statComparisons.textContent = comparisons;
  statSwaps.textContent       = swaps;
}

// ─── PAUSE / RESUME ───────────────────────────────────────
function togglePause() {
  if (!isSorting) return;

  if (!isPaused) {
    isPaused = true;
    setStatus('Paused');
    btnPause.textContent = '▶ Resume';
    btnStep.disabled = false;
    setExplanation('Paused', 'Use <strong>Step</strong> to advance one step, or <strong>Resume</strong> to continue automatically.');
  } else {
    // Resume handled by btnStart logic
    startSorting();
  }
}

// ─── STEP-BY-STEP ─────────────────────────────────────────
function doNextStep() {
  // If not yet started, compute steps and go into step mode
  if (!isSorting) {
    resetCounters();
    computeSteps();
    isSorting = true;
    stepMode  = true;
    isPaused  = true;
    startTime = Date.now();
    startTimer();
    setStatus('Paused');
    btnStart.disabled    = true;
    btnPause.disabled    = false;
    btnReset.disabled    = false;
    btnGenerate.disabled = true;
    sizeSlider.disabled  = true;
    btnPause.textContent = '▶ Resume';
  }

  if (stepIndex < steps.length) {
    applyStep(steps[stepIndex]);
    stepIndex++;
  }

  if (stepIndex >= steps.length) {
    finishSorting();
  }
}

// ─── FINISH ───────────────────────────────────────────────
function finishSorting() {
  isSorting = false;
  isPaused  = false;
  clearInterval(timerInterval);
  setStatus('Done!');

  btnStart.disabled    = false;
  btnPause.disabled    = true;
  btnStep.disabled     = true;
  btnReset.disabled    = false;
  btnGenerate.disabled = false;
  sizeSlider.disabled  = false;
  btnPause.textContent = '⏸ Pause';
  btnStart.textContent = '▶ Start';

  setExplanation('Sorted! 🎉', `Completed in <strong>${comparisons}</strong> comparisons and <strong>${swaps}</strong> swaps.`);
}

// ─── TIMER ────────────────────────────────────────────────
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const ms = Date.now() - startTime;
    statTime.textContent = ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  }, 50);
}

// ─── SPEED → DELAY MAPPING ────────────────────────────────
/**
 * Maps speed (1–10) to a delay in ms.
 * Speed 1 = 600ms delay (slow), speed 10 = 8ms (very fast).
 */
function getDelay() {
  const speed = parseInt(speedSlider.value);
  const delays = [600, 400, 250, 160, 100, 65, 40, 25, 14, 8];
  return delays[speed - 1] ?? 60;
}

// ─── UTILS ────────────────────────────────────────────────
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
