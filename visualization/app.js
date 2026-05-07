/**
 * StatsBomb Interactive Visualization
 * Advanced Interactive Version
 */

// ============================================================================
// GLOBALS
// ============================================================================

let allSequences = [];
let allMatches = [];
let filteredSequences = [];

let currentSequenceIndex = 0;

let isPlaying = false;
let animationFrameId = null;

let hoverPass = null;
let passHitboxes = [];

const canvas = document.getElementById('fieldCanvas');
const ctx = canvas.getContext('2d');

const FIELD_WIDTH = 120;
const FIELD_HEIGHT = 80;

const SCALE_X = canvas.width / FIELD_WIDTH;
const SCALE_Y = canvas.height / FIELD_HEIGHT;

// ============================================================================
// LOAD DATA
// ============================================================================

async function loadData() {

    try {

        const [seqResponse, matchResponse] = await Promise.all([
            fetch('../data/possessions.json'),
            fetch('../data/matches.json')
        ]);

        allSequences = await seqResponse.json();
        allMatches = await matchResponse.json();

        allSequences = allSequences.filter(seq =>
            seq &&
            Array.isArray(seq.passes) &&
            seq.passes.length > 0
        );

        initializeUI();

        applyFilters();

    } catch (error) {

        console.error(error);

        document.getElementById(
            'sequencesList'
        ).innerHTML = `
            <p style="color:red;">
                Error loading data
            </p>
        `;
    }
}

// ============================================================================
// INIT UI
// ============================================================================

function initializeUI() {

    const matchSelect =
        document.getElementById(
            'matchSelect'
        );

    allMatches.forEach(match => {

        const option =
            document.createElement('option');

        option.value = match.match_id;

        option.textContent =
            `${match.home_team} vs ` +
            `${match.away_team} ` +
            `(${match.match_date})`;

        matchSelect.appendChild(option);
    });

    // Filters
    [
        'matchSelect',
        'teamSelect',
        'filterType'
    ].forEach(id => {

        document
            .getElementById(id)
            .addEventListener(
                'change',
                applyFilters
            );
    });

    // Buttons
    document
        .getElementById('playBtn')
        .addEventListener(
            'click',
            togglePlayback
        );

    document
        .getElementById('resetBtn')
        .addEventListener(
            'click',
            resetView
        );

    document
        .getElementById('prevBtn')
        .addEventListener(
            'click',
            previousSequence
        );

    document
        .getElementById('nextBtn')
        .addEventListener(
            'click',
            nextSequence
        );

    // Hover
    canvas.addEventListener(
        'mousemove',
        handleMouseMove
    );

    canvas.addEventListener(
        'mouseleave',
        () => {

            hoverPass = null;
            drawField();
        }
    );
}

// ============================================================================
// FILTERS
// ============================================================================

function applyFilters() {

    const matchId = parseInt(
        document.getElementById(
            'matchSelect'
        ).value
    );

    const team =
        document.getElementById(
            'teamSelect'
        ).value;

    const filterType =
        document.getElementById(
            'filterType'
        ).value;

    filteredSequences =
        allSequences.filter(seq => {

            if (
                seq.match_id !== matchId
            ) {
                return false;
            }

            if (
                team &&
                seq.team !== team
            ) {
                return false;
            }

            if (
                filterType === 'with-shot' &&
                !seq.ended_in_shot
            ) {
                return false;
            }

            if (
                filterType === 'with-goal' &&
                !seq.ended_in_goal
            ) {
                return false;
            }

            if (
                filterType === 'no-goal' &&
                seq.ended_in_goal
            ) {
                return false;
            }

            return true;
        });

    // Teams
    const teams = [
        ...new Set(
            allSequences
                .filter(
                    s => s.match_id === matchId
                )
                .map(s => s.team)
        )
    ];

    const teamSelect =
        document.getElementById(
            'teamSelect'
        );

    const prevValue =
        teamSelect.value;

    teamSelect.innerHTML =
        '<option value="">-- Todos --</option>';

    teams.forEach(team => {

        const option =
            document.createElement('option');

        option.value = team;
        option.textContent = team;

        teamSelect.appendChild(option);
    });

    if (teams.includes(prevValue)) {
        teamSelect.value = prevValue;
    }

    currentSequenceIndex = 0;

    updateStats();
    updateSequencesList();
    drawField();
    updateDetails();
}

// ============================================================================
// STATS
// ============================================================================

function updateStats() {

    const total =
        filteredSequences.length;

    const withShot =
        filteredSequences.filter(
            s => s.ended_in_shot
        ).length;

    const withGoal =
        filteredSequences.filter(
            s => s.ended_in_goal
        ).length;

    const totalPasses =
        filteredSequences.reduce(
            (sum, s) =>
                sum + s.pass_count,
            0
        );

    const successful =
        filteredSequences.reduce(
            (sum, s) =>
                sum + s.successful_passes,
            0
        );

    document.getElementById(
        'totalSequences'
    ).textContent = total;

    document.getElementById(
        'withShot'
    ).textContent = withShot;

    document.getElementById(
        'withGoal'
    ).textContent = withGoal;

    document.getElementById(
        'conversionRate'
    ).textContent =
        withShot > 0
            ? `${(
                withGoal /
                withShot *
                100
            ).toFixed(1)}%`
            : '0%';

    document.getElementById(
        'avgPasses'
    ).textContent =
        total > 0
            ? (
                totalPasses / total
            ).toFixed(1)
            : '0';

    document.getElementById(
        'accuracy'
    ).textContent =
        totalPasses > 0
            ? `${(
                successful /
                totalPasses *
                100
            ).toFixed(1)}%`
            : '0%';
}

// ============================================================================
// LIST
// ============================================================================

function updateSequencesList() {

    const list =
        document.getElementById(
            'sequencesList'
        );

    list.innerHTML = '';

    filteredSequences
        .slice(0, 100)
        .forEach((seq, idx) => {

            const div =
                document.createElement('div');

            div.className =
                'sequence-item';

            if (
                idx === currentSequenceIndex
            ) {
                div.classList.add('active');
            }

            const firstPass =
                seq.passes[0];

            div.innerHTML = `
                <div>
                    <strong>${seq.team}</strong>
                    ${seq.ended_in_goal ? '⚽' : ''}
                </div>

                <div class="sequence-meta">
                    <span>
                        Min ${firstPass.minute}'
                    </span>

                    <span>
                        ${seq.pass_count} pases
                    </span>
                </div>
            `;

            div.addEventListener(
                'click',
                () => selectSequence(idx)
            );

            list.appendChild(div);
        });
}

function selectSequence(idx) {

    currentSequenceIndex = idx;

    updateSequencesList();
    drawField();
    updateDetails();
}

// ============================================================================
// DRAW FIELD
// ============================================================================

function drawField() {

    passHitboxes = [];

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle = '#145214';

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;

    // Midline
    ctx.beginPath();

    ctx.moveTo(
        canvas.width / 2,
        0
    );

    ctx.lineTo(
        canvas.width / 2,
        canvas.height
    );

    ctx.stroke();

    // Circle
    ctx.beginPath();

    ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        9.15 * SCALE_X,
        0,
        Math.PI * 2
    );

    ctx.stroke();

    // Boxes
    ctx.strokeRect(
        0,
        (80 - 44) / 2 * SCALE_Y,
        16.5 * SCALE_X,
        44 * SCALE_Y
    );

    ctx.strokeRect(
        canvas.width - 16.5 * SCALE_X,
        (80 - 44) / 2 * SCALE_Y,
        16.5 * SCALE_X,
        44 * SCALE_Y
    );

    if (
        filteredSequences.length > 0
    ) {

        drawSequence(
            filteredSequences[
                currentSequenceIndex
            ]
        );
    }
}

// ============================================================================
// DRAW SEQUENCE
// ============================================================================

function drawSequence(seq) {

    seq.passes.forEach((pass, idx) => {

        const x1 = pass.x * SCALE_X;
        const y1 = pass.y * SCALE_Y;

        const x2 = pass.end_x * SCALE_X;
        const y2 = pass.end_y * SCALE_Y;

        passHitboxes.push({
            x1,
            y1,
            x2,
            y2,
            pass,
            idx
        });

        ctx.strokeStyle =
            pass.successful
                ? '#2ecc71'
                : '#e74c3c';

        ctx.lineWidth =
            hoverPass === idx
                ? 7
                : 3;

        ctx.beginPath();

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);

        ctx.stroke();

        // Origin
        ctx.fillStyle =
            idx === 0
                ? '#3498db'
                : '#ddd';

        ctx.beginPath();

        ctx.arc(
            x1,
            y1,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // Number
        ctx.fillStyle = '#fff';

        ctx.font =
            'bold 11px Arial';

        ctx.fillText(
            idx + 1,
            x1,
            y1
        );
    });

    // Shot
    if (seq.shot) {

        ctx.fillStyle =
            seq.shot.goal
                ? '#ff0000'
                : '#f1c40f';

        ctx.beginPath();

        ctx.arc(
            seq.shot.x * SCALE_X,
            seq.shot.y * SCALE_Y,
            6,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    // Hover tooltip
    if (
        hoverPass !== null
    ) {

        const item =
            passHitboxes[hoverPass];

        if (item) {

            drawTooltip(item);
        }
    }
}

// ============================================================================
// TOOLTIP
// ============================================================================

function drawTooltip(item) {

    const pass =
        item.pass;

    const text1 =
        `#${item.idx + 1} ${pass.player}`;

    const text2 =
        `${pass.minute}' ${pass.second}"`;

    const text3 =
        pass.successful
            ? 'Successful'
            : 'Failed';

    const x =
        item.x2 + 15;

    const y =
        item.y2;

    ctx.fillStyle =
        'rgba(0,0,0,0.9)';

    ctx.fillRect(
        x,
        y,
        180,
        60
    );

    ctx.fillStyle = '#fff';

    ctx.font =
        '12px Arial';

    ctx.fillText(
        text1,
        x + 10,
        y + 18
    );

    ctx.fillText(
        text2,
        x + 10,
        y + 35
    );

    ctx.fillText(
        text3,
        x + 10,
        y + 52
    );
}

// ============================================================================
// HOVER DETECTION
// ============================================================================

function handleMouseMove(event) {

    const rect =
        canvas.getBoundingClientRect();

    const mouseX =
        event.clientX - rect.left;

    const mouseY =
        event.clientY - rect.top;

    hoverPass = null;

    passHitboxes.forEach(
        (item, idx) => {

            const dist =
                distanceToSegment(
                    mouseX,
                    mouseY,
                    item.x1,
                    item.y1,
                    item.x2,
                    item.y2
                );

            if (dist < 8) {
                hoverPass = idx;
            }
        }
    );

    drawField();
}

// ============================================================================
// DISTANCE
// ============================================================================

function distanceToSegment(
    px,
    py,
    x1,
    y1,
    x2,
    y2
) {

    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot =
        A * C + B * D;

    const lenSq =
        C * C + D * D;

    let param = -1;

    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx;
    let yy;

    if (param < 0) {

        xx = x1;
        yy = y1;

    } else if (param > 1) {

        xx = x2;
        yy = y2;

    } else {

        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;

    return Math.sqrt(
        dx * dx + dy * dy
    );
}

// ============================================================================
// DETAILS
// ============================================================================

function updateDetails() {

    const container =
        document.getElementById(
            'detailsContent'
        );

    if (
        filteredSequences.length === 0
    ) {

        container.innerHTML =
            '<p>No data</p>';

        return;
    }

    const seq =
        filteredSequences[
            currentSequenceIndex
        ];

    container.innerHTML = `
        <h3>${seq.team}</h3>

        <p>
            Possession:
            ${seq.pass_count} passes
        </p>

        <p>
            Shot:
            ${seq.ended_in_shot ? 'YES' : 'NO'}
        </p>

        <p>
            Goal:
            ${seq.ended_in_goal ? 'YES ⚽' : 'NO'}
        </p>
    `;
}

// ============================================================================
// NAVIGATION
// ============================================================================

function nextSequence() {

    currentSequenceIndex =
        (
            currentSequenceIndex + 1
        ) %
        filteredSequences.length;

    updateSequencesList();
    drawField();
    updateDetails();
}

function previousSequence() {

    currentSequenceIndex--;

    if (currentSequenceIndex < 0) {

        currentSequenceIndex =
            filteredSequences.length - 1;
    }

    updateSequencesList();
    drawField();
    updateDetails();
}

// ============================================================================
// PLAYBACK
// ============================================================================

function togglePlayback() {

    isPlaying = !isPlaying;

    const btn =
        document.getElementById(
            'playBtn'
        );

    if (isPlaying) {

        btn.textContent =
            '⏸ Pause';

        playbackLoop();

    } else {

        btn.textContent =
            '▶ Play';
    }
}

function playbackLoop() {

    if (!isPlaying) {
        return;
    }

    nextSequence();

    setTimeout(() => {

        animationFrameId =
            requestAnimationFrame(
                playbackLoop
            );

    }, 2000);
}

// ============================================================================
// RESET
// ============================================================================

function resetView() {

    isPlaying = false;

    currentSequenceIndex = 0;

    document.getElementById(
        'playBtn'
    ).textContent =
        '▶ Play';

    drawField();
    updateDetails();
    updateSequencesList();
}

// ============================================================================
// INIT
// ============================================================================

document.addEventListener(
    'DOMContentLoaded',
    loadData
);

window.addEventListener(
    'resize',
    drawField
);