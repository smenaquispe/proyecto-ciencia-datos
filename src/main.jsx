import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import './styles.css';

const PITCH = { width: 120, height: 80 };
const RESULT_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'with-shot', label: 'Con tiro' },
  { value: 'with-goal', label: 'Con gol' },
  { value: 'no-goal', label: 'Sin gol' }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toMinuteBucket(minute) {
  const value = Number.isFinite(minute) ? Math.floor(minute) : 0;
  return clamp(value, 0, 130);
}

function uniqueSorted(items) {
  return [...new Set(items)].filter(Boolean).sort((left, right) => left.localeCompare(right));
}

function formatMinute(pass) {
  const minute = Number.isFinite(pass?.minute) ? pass.minute : 0;
  const second = Number.isFinite(pass?.second) ? String(pass.second).padStart(2, '0') : '00';
  return `${minute}'${second}"`;
}

function buildCumulativeSeries(pointsByMinute, maxMinute) {
  const series = [];
  let total = 0;

  for (let minute = 0; minute <= maxMinute; minute += 1) {
    total += pointsByMinute.get(minute) ?? 0;
    series.push({ minute, total });
  }

  return series;
}

function buildMiniSparkline(series) {
  if (!series.length) {
    return '';
  }

  const width = 96;
  const height = 28;
  const max = Math.max(...series.map((item) => item.total), 1);
  const step = series.length > 1 ? width / (series.length - 1) : width;

  return series
    .map((item, index) => {
      const x = index * step;
      const y = height - (item.total / max) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function getCutoffSequence(sequence, minuteCutoff) {
  const visiblePasses = sequence.passes.filter((pass) => toMinuteBucket(pass.minute) <= minuteCutoff);

  if (!visiblePasses.length) {
    return null;
  }

  const lastOriginalPass = sequence.passes[sequence.passes.length - 1] ?? null;
  const lastOriginalMinute = toMinuteBucket(lastOriginalPass?.minute ?? 0);
  const visibleShot = Boolean(sequence.ended_in_shot && lastOriginalMinute <= minuteCutoff);
  const visibleGoal = Boolean(sequence.ended_in_goal && lastOriginalMinute <= minuteCutoff);

  return {
    ...sequence,
    passes: visiblePasses,
    pass_count: visiblePasses.length,
    successful_passes: visiblePasses.filter((pass) => pass.successful).length,
    ended_in_shot: visibleShot,
    ended_in_goal: visibleGoal,
    shot: visibleShot || visibleGoal ? sequence.shot : null
  };
}

function createHeatmapCells(points) {
  const columns = 12;
  const rows = 8;
  const cells = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => ({
      row,
      column,
      count: 0
    }))
  ).flat();

  points.forEach((point) => {
    const column = clamp(Math.floor((point.x / PITCH.width) * columns), 0, columns - 1);
    const row = clamp(Math.floor((point.y / PITCH.height) * rows), 0, rows - 1);
    cells[row * columns + column].count += 1;
  });

  const max = Math.max(...cells.map((cell) => cell.count), 1);
  return { cells, columns, rows, max };
}

function heatColor(count, max) {
  if (!count) {
    return 'rgba(255,255,255,0.03)';
  }

  const ratio = count / max;
  const alpha = 0.12 + ratio * 0.78;
  const lightness = 70 - ratio * 24;
  return `hsla(25, 100%, ${lightness}%, ${alpha})`;
}

function TooltipCard({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="chart-tooltip__row">
          <span className="chart-tooltip__dot" style={{ background: entry.color }} />
          <span>{entry.name ?? entry.dataKey}</span>
          <strong>{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value, subtitle }) {
  return (
    <article className="metric-card">
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value}</strong>
      {subtitle ? <span className="metric-card__subtitle">{subtitle}</span> : null}
    </article>
  );
}

function SequenceButton({ sequence, active, onSelect }) {
  const firstPass = sequence.passes?.[0] ?? {};

  return (
    <button className={`sequence-card ${active ? 'is-active' : ''}`} type="button" onClick={onSelect}>
      <div className="sequence-card__top">
        <strong>{sequence.team}</strong>
        <span>{sequence.ended_in_goal ? 'Gol' : sequence.ended_in_shot ? 'Tiro' : 'Secuencia'}</span>
      </div>
      <div className="sequence-card__meta">
        <span>{formatMinute(firstPass)}</span>
        <span>{sequence.pass_count ?? sequence.passes?.length ?? 0} pases</span>
      </div>
    </button>
  );
}

function PitchView({ sequence, activePlayer, hoveredPassIndex, onHoverPass, onClearHover, onSelectPass }) {
  return (
    <div className="pitch-shell">
      <svg className="pitch-svg" viewBox="0 0 120 80" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="grassGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#155d28" />
            <stop offset="100%" stopColor="#0f4520" />
          </linearGradient>
          <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="#f8fafc" opacity="0.9" />
          </marker>
        </defs>

        <rect x="0" y="0" width="120" height="80" rx="1.2" fill="url(#grassGradient)" />
        <path d="M60 0V80" className="pitch-line" />
        <circle cx="60" cy="40" r="9.15" className="pitch-line pitch-line--circle" />
        <rect x="0" y="18" width="16.5" height="44" className="pitch-line" />
        <rect x="103.5" y="18" width="16.5" height="44" className="pitch-line" />
        <rect x="0" y="30" width="5.5" height="20" className="pitch-line pitch-line--box" />
        <rect x="114.5" y="30" width="5.5" height="20" className="pitch-line pitch-line--box" />
        <circle cx="60" cy="40" r="1.1" className="pitch-line pitch-line--spot" />

        {sequence?.passes?.map((pass, index) => {
          const isActive = hoveredPassIndex === index;
          const isSelectedPlayer = activePlayer && pass.player === activePlayer;
          const stroke = pass.successful ? '#5eead4' : '#fb7185';

          return (
            <g key={`${sequence.id ?? 'sequence'}-${index}`}>
              <line
                x1={pass.x}
                y1={pass.y}
                x2={pass.end_x}
                y2={pass.end_y}
                stroke={stroke}
                strokeWidth={isActive ? 0.9 : 0.55}
                strokeLinecap="round"
                markerEnd="url(#arrowHead)"
                opacity={isSelectedPlayer ? 1 : 0.88}
                className="pass-line"
                onMouseEnter={() => onHoverPass(index)}
                onMouseLeave={onClearHover}
                onClick={() => onSelectPass(index)}
              />
              <circle
                cx={pass.x}
                cy={pass.y}
                r={isActive ? 1.9 : 1.35}
                fill={index === 0 ? '#60a5fa' : '#e2e8f0'}
                stroke={isSelectedPlayer ? '#fef08a' : 'transparent'}
                strokeWidth="0.75"
                className="pass-node"
                onMouseEnter={() => onHoverPass(index)}
                onMouseLeave={onClearHover}
                onClick={() => onSelectPass(index)}
              />
            </g>
          );
        })}

        {sequence?.shot ? (
          <g>
            <circle
              cx={sequence.shot.x}
              cy={sequence.shot.y}
              r="2.4"
              fill={sequence.shot.goal ? '#f87171' : '#f59e0b'}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="0.6"
            />
            <text x={sequence.shot.x + 2} y={sequence.shot.y - 1.3} className="shot-label">
              Shot
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function HeatmapView({ cells, columns, rows, max, scopeLabel }) {
  return (
    <div className="pitch-shell pitch-shell--heatmap">
      <svg className="pitch-svg" viewBox="0 0 120 80" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="heatGrassGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#123f22" />
            <stop offset="100%" stopColor="#0d2d19" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="120" height="80" rx="1.2" fill="url(#heatGrassGradient)" />
        {cells.map((cell) => {
          const cellWidth = PITCH.width / columns;
          const cellHeight = PITCH.height / rows;
          return (
            <rect
              key={`${cell.row}-${cell.column}`}
              x={cell.column * cellWidth}
              y={cell.row * cellHeight}
              width={cellWidth}
              height={cellHeight}
              fill={heatColor(cell.count, max)}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="0.2"
            >
              <title>{`${scopeLabel}: ${cell.count} acciones`}</title>
            </rect>
          );
        })}
        <path d="M60 0V80" className="pitch-line" />
        <circle cx="60" cy="40" r="9.15" className="pitch-line pitch-line--circle" />
        <rect x="0" y="18" width="16.5" height="44" className="pitch-line" />
        <rect x="103.5" y="18" width="16.5" height="44" className="pitch-line" />
      </svg>
    </div>
  );
}

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState([]);
  const [possessions, setPossessions] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [selectedSequenceIndex, setSelectedSequenceIndex] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState('all');
  const [hoveredPassIndex, setHoveredPassIndex] = useState(null);
  const [heatmapScope, setHeatmapScope] = useState('match');
  const [selectedMinute, setSelectedMinute] = useState(35);

  useEffect(() => {
    async function loadData() {
      try {
        const [matchesResponse, possessionsResponse] = await Promise.all([
          fetch('/data/matches.json'),
          fetch('/data/possessions.json')
        ]);

        if (!matchesResponse.ok || !possessionsResponse.ok) {
          throw new Error('No se pudieron cargar los JSON del dashboard.');
        }

        const [matchesData, possessionsData] = await Promise.all([matchesResponse.json(), possessionsResponse.json()]);

        setMatches(matchesData);
        setPossessions(Array.isArray(possessionsData) ? possessionsData : []);
        setSelectedMatchId(matchesData?.[0]?.match_id ? String(matchesData[0].match_id) : '');
      } catch (loadError) {
        setError(loadError.message || 'Error inesperado al cargar datos.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const selectedMatch = useMemo(() => matches.find((match) => String(match.match_id) === selectedMatchId) ?? matches[0], [matches, selectedMatchId]);

  const matchPossessions = useMemo(
    () => possessions.filter((sequence) => String(sequence.match_id) === selectedMatchId && Array.isArray(sequence.passes) && sequence.passes.length > 0),
    [possessions, selectedMatchId]
  );

  const availableTeams = useMemo(() => uniqueSorted(matchPossessions.map((sequence) => sequence.team)), [matchPossessions]);

  useEffect(() => {
    if (teamFilter !== 'all' && !availableTeams.includes(teamFilter)) {
      setTeamFilter('all');
    }
  }, [availableTeams, teamFilter]);

  const filteredPossessions = useMemo(() => {
    return matchPossessions.filter((sequence) => {
      if (teamFilter !== 'all' && sequence.team !== teamFilter) {
        return false;
      }

      if (resultFilter === 'with-shot' && !sequence.ended_in_shot) {
        return false;
      }

      if (resultFilter === 'with-goal' && !sequence.ended_in_goal) {
        return false;
      }

      if (resultFilter === 'no-goal' && sequence.ended_in_goal) {
        return false;
      }

      return true;
    });
  }, [matchPossessions, teamFilter, resultFilter]);

  const cutoffPossessions = useMemo(
    () => filteredPossessions.map((sequence) => getCutoffSequence(sequence, selectedMinute)).filter(Boolean),
    [filteredPossessions, selectedMinute]
  );

  const activeSequenceIndex = useMemo(() => {
    if (!cutoffPossessions.length) {
      return -1;
    }

    let index = 0;
    let latestMinute = -1;

    cutoffPossessions.forEach((sequence, sequenceIndex) => {
      const sequenceMinute = toMinuteBucket(sequence.passes?.[0]?.minute ?? 0);
      if (sequenceMinute <= selectedMinute && sequenceMinute >= latestMinute) {
        latestMinute = sequenceMinute;
        index = sequenceIndex;
      }
    });

    return index;
  }, [cutoffPossessions, selectedMinute]);

  useEffect(() => {
    setSelectedSequenceIndex(0);
    setHoveredPassIndex(null);
  }, [selectedMatchId, teamFilter, resultFilter, selectedPlayer]);

  useEffect(() => {
    setSelectedSequenceIndex(activeSequenceIndex >= 0 ? activeSequenceIndex : 0);
    setHoveredPassIndex(null);
  }, [activeSequenceIndex, selectedMinute]);

  const selectedSequence = cutoffPossessions[selectedSequenceIndex] ?? cutoffPossessions[activeSequenceIndex] ?? cutoffPossessions[0] ?? null;

  useEffect(() => {
    if (selectedSequenceIndex >= cutoffPossessions.length) {
      setSelectedSequenceIndex(0);
    }
  }, [cutoffPossessions.length, selectedSequenceIndex]);

  const selectedSequencePasses = selectedSequence?.passes ?? [];
  const selectedPass = hoveredPassIndex !== null ? selectedSequencePasses[hoveredPassIndex] : selectedSequencePasses[0] ?? null;

  const possessionsWithShot = cutoffPossessions.filter((sequence) => sequence.ended_in_shot).length;
  const possessionsWithGoal = cutoffPossessions.filter((sequence) => sequence.ended_in_goal).length;
  const totalPasses = cutoffPossessions.reduce((sum, sequence) => sum + (sequence.pass_count ?? sequence.passes.length), 0);

  const maxMinute = useMemo(() => {
    const possessionMinutes = cutoffPossessions.map((sequence) => toMinuteBucket(sequence.passes?.[0]?.minute ?? 0));
    const passMinutes = cutoffPossessions.flatMap((sequence) => sequence.passes.map((pass) => toMinuteBucket(pass.minute)));
    return Math.max(90, ...possessionMinutes, ...passMinutes, 130);
  }, [cutoffPossessions]);

  useEffect(() => {
    setSelectedMinute((currentMinute) => clamp(currentMinute, 0, maxMinute));
  }, [maxMinute]);

  const selectedMinutePasses = useMemo(
    () =>
      cutoffPossessions.flatMap((sequence) =>
        sequence.passes
          .filter((pass) => toMinuteBucket(pass.minute) <= selectedMinute)
          .map((pass) => ({ ...pass, team: sequence.team }))
      ),
    [cutoffPossessions, selectedMinute]
  );

  const playerRanking = useMemo(() => {
    const players = new Map();

    selectedMinutePasses.forEach((pass) => {
      if (!pass.player) {
        return;
      }

      const entry = players.get(pass.player) ?? {
        player: pass.player,
        team: pass.team,
        total: 0,
        successful: 0,
        minuteBuckets: new Map()
      };

      entry.total += 1;
      if (pass.successful) {
        entry.successful += 1;
      }

      const minute = toMinuteBucket(pass.minute);
      entry.minuteBuckets.set(minute, (entry.minuteBuckets.get(minute) ?? 0) + (pass.successful ? 1 : 0));
      players.set(pass.player, entry);
    });

    return [...players.values()]
      .map((entry) => ({
        ...entry,
        accuracy: entry.total ? entry.successful / entry.total : 0,
        timeline: buildCumulativeSeries(entry.minuteBuckets, selectedMinute)
      }))
      .sort((left, right) => right.successful - left.successful || right.total - left.total)
      .slice(0, 12);
  }, [selectedMinutePasses, selectedMinute]);

  const rankingSuccessfulTotal = useMemo(
    () => playerRanking.reduce((sum, player) => sum + player.successful, 0),
    [playerRanking]
  );

  const heatmapPoints = useMemo(() => {
    const source = heatmapScope === 'selected' && selectedSequence ? [selectedSequence] : cutoffPossessions;
    return source.flatMap((sequence) => sequence.passes.map((pass) => ({ x: pass.x, y: pass.y })));
  }, [cutoffPossessions, heatmapScope, selectedSequence]);

  const heatmap = useMemo(() => createHeatmapCells(heatmapPoints), [heatmapPoints]);

  if (loading) {
    return (
      <main className="loading-state">
        <div className="loading-card">
          <span className="loading-card__eyebrow">StatsBomb React Dashboard</span>
          <h1>Cargando datos tácticos</h1>
          <p>Procesando partidos, secuencias y pases para armar la visualización interactiva.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="loading-state">
        <div className="loading-card loading-card--error">
          <span className="loading-card__eyebrow">Error</span>
          <h1>No se pudo iniciar el dashboard</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div>
          <span className="hero-card__eyebrow">StatsBomb React Dashboard</span>
          <h1>Campo, heatmap y ranking acumulado en una sola lectura</h1>
          <p>Explora los pases efectivos hasta el minuto que selecciones con una interfaz interactiva y compacta.</p>
        </div>

        <div className="hero-card__match">
          <strong>{selectedMatch ? `${selectedMatch.home_team} vs ${selectedMatch.away_team}` : 'Sin partido'}</strong>
          <span>{selectedMatch ? `${selectedMatch.match_date} · ${selectedMatch.home_score}-${selectedMatch.away_score}` : ''}</span>
        </div>
      </header>

      <section className="toolbar-card">
        <div className="field-group">
          <label htmlFor="matchSelect">Partido</label>
          <select id="matchSelect" value={selectedMatchId} onChange={(event) => setSelectedMatchId(event.target.value)}>
            {matches.map((match) => (
              <option key={match.match_id} value={String(match.match_id)}>
                {match.home_team} vs {match.away_team} ({match.match_date})
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="teamSelect">Equipo</label>
          <select id="teamSelect" value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
            <option value="all">-- Todos --</option>
            {availableTeams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="resultSelect">Filtro</label>
          <select id="resultSelect" value={resultFilter} onChange={(event) => setResultFilter(event.target.value)}>
            {RESULT_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="heatmapScope">Mapa de calor</label>
          <select id="heatmapScope" value={heatmapScope} onChange={(event) => setHeatmapScope(event.target.value)}>
            <option value="match">Partido filtrado</option>
            <option value="selected">Secuencia activa</option>
          </select>
        </div>

        <div className="field-group field-group--range">
          <label htmlFor="minuteRange">Minuto de corte</label>
          <input
            id="minuteRange"
            type="range"
            min="0"
            max={maxMinute}
            step="1"
            value={selectedMinute}
            onChange={(event) => setSelectedMinute(Number(event.target.value))}
          />
          <div className="field-group__meta">
            <span>Acumulado hasta el minuto</span>
            <strong>{selectedMinute}'</strong>
          </div>
        </div>

        <div className="toolbar-card__actions">
          <button type="button" className="pill-button" onClick={() => setSelectedPlayer('all')}>
            Limpiar foco
          </button>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="Minuto activo" value={`${selectedMinute}'`} subtitle="Corte temporal del ranking" />
        <MetricCard label="Pases al corte" value={totalPasses} subtitle="Hasta el minuto seleccionado" />
        <MetricCard label="Pases efectivos" value={rankingSuccessfulTotal} subtitle="Acumulados en la ventana" />
        <MetricCard
          label="Precisión acumulada"
          value={`${(totalPasses ? (rankingSuccessfulTotal / totalPasses) * 100 : 0).toFixed(1)}%`}
          subtitle="Pases efectivos / pases al corte"
        />
        <MetricCard label="Con tiro" value={possessionsWithShot} subtitle="Secuencias que llegan a tiro antes del corte" />
        <MetricCard label="Goles" value={possessionsWithGoal} subtitle="Secuencias con gol antes del corte" />
      </section>

      <section className="dashboard-grid">
        <article className="panel panel--pitch">
          <div className="panel__header">
            <div>
              <span className="panel__eyebrow">Secuencia activa</span>
              <h2>{selectedSequence ? selectedSequence.team : 'Sin secuencia'}</h2>
            </div>
            <div className="panel__meta">
              {selectedSequence ? (
                <>
                  <span>{selectedSequence.ended_in_shot ? 'Con tiro' : 'Sin tiro'}</span>
                  <span>{selectedSequence.ended_in_goal ? 'Gol' : 'No gol'}</span>
                </>
              ) : null}
            </div>
          </div>

          <PitchView
            sequence={selectedSequence}
            activePlayer={selectedPlayer === 'all' ? null : selectedPlayer}
            hoveredPassIndex={hoveredPassIndex}
            onHoverPass={setHoveredPassIndex}
            onClearHover={() => setHoveredPassIndex(null)}
            onSelectPass={(index) => setHoveredPassIndex(index)}
          />

          <div className="pass-details">
            <div className="pass-details__summary">
              <strong>{selectedPass ? selectedPass.player : 'Pasa por un punto'}</strong>
              <span>{selectedPass ? formatMinute(selectedPass) : 'Hover sobre una línea o un nodo'}</span>
            </div>

            <div className="sequence-list sequence-list--compact">
              {selectedSequencePasses.map((pass, index) => (
                <button
                  type="button"
                  key={`${selectedSequence?.id ?? 'seq'}-${index}`}
                  className={`sequence-row ${hoveredPassIndex === index ? 'is-active' : ''}`}
                  onMouseEnter={() => setHoveredPassIndex(index)}
                  onMouseLeave={() => setHoveredPassIndex(null)}
                  onClick={() => setSelectedPlayer(pass.player)}
                >
                  <span className="sequence-row__index">#{index + 1}</span>
                  <span className="sequence-row__player">{pass.player}</span>
                  <span className={`sequence-row__status ${pass.successful ? 'is-success' : 'is-failed'}`}>
                    {pass.successful ? 'OK' : 'Falló'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </article>

        <article className="panel panel--heatmap">
          <div className="panel__header">
            <div>
              <span className="panel__eyebrow">Mapa de calor</span>
              <h2>{heatmapScope === 'selected' ? 'Secuencia activa' : 'Partido filtrado'}</h2>
            </div>
            <div className="panel__meta">
              <span>{heatmapPoints.length} eventos</span>
            </div>
          </div>

          <HeatmapView
            cells={heatmap.cells}
            columns={heatmap.columns}
            rows={heatmap.rows}
            max={heatmap.max}
            scopeLabel={heatmapScope === 'selected' ? 'Secuencia activa' : 'Partido filtrado'}
          />

          <div className="legend-row">
            <span>Intensidad</span>
            <div className="legend-swatch">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </article>

        <article className="panel panel--chart panel--wide">
          <div className="panel__header">
            <div>
              <span className="panel__eyebrow">Ranking de jugadores</span>
              <h2>Pases efectivos acumulados hasta {selectedMinute}'</h2>
            </div>
            <div className="panel__meta">
              <span>{playerRanking.length} jugadores destacados</span>
            </div>
          </div>

          <div className="ranking-grid">
            <div className="ranking-list">
              {playerRanking.map((player) => (
                <button
                  key={player.player}
                  type="button"
                  className={`ranking-row ${selectedPlayer === player.player ? 'is-active' : ''}`}
                  onClick={() => setSelectedPlayer(player.player)}
                >
                  <div className="ranking-row__main">
                    <strong>{player.player}</strong>
                    <span>{player.team}</span>
                  </div>
                  <div className="ranking-row__metrics">
                    <span>{player.successful} efectivos</span>
                    <span>{(player.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <svg viewBox="0 0 96 28" className="ranking-row__sparkline" preserveAspectRatio="none">
                    <path d={buildMiniSparkline(player.timeline)} />
                  </svg>
                </button>
              ))}
            </div>

            <div className="chart-box chart-box--ranking">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={
                    selectedPlayer === 'all'
                      ? playerRanking[0]?.timeline ?? []
                      : playerRanking.find((player) => player.player === selectedPlayer)?.timeline ?? []
                  }
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="minute" tick={{ fill: '#cbd5e1', fontSize: 12 }} stroke="rgba(255,255,255,0.18)" />
                  <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} stroke="rgba(255,255,255,0.18)" />
                  <Tooltip content={<TooltipCard />} />
                  <ReferenceLine x={selectedMinute} stroke="rgba(94, 234, 212, 0.75)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="total" name="Pases efectivos" stroke="#f59e0b" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className="panel panel--wide">
          <div className="panel__header">
            <div>
              <span className="panel__eyebrow">Secuencias</span>
              <h2>Secuencias filtradas</h2>
            </div>
            <div className="panel__meta">
              <span>{cutoffPossessions.length} disponibles</span>
            </div>
          </div>

          <div className="sequence-list sequence-list--full">
            {cutoffPossessions.slice(0, 24).map((sequence, index) => (
              <SequenceButton
                key={`${sequence.id ?? index}-${sequence.match_id}`}
                sequence={sequence}
                active={selectedSequenceIndex === index}
                onSelect={() => setSelectedSequenceIndex(index)}
              />
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);