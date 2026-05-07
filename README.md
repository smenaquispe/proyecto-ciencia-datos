# ⚽ StatsBomb Interactive Analysis

Visualización interactiva de pases, goles y secuencias de juego con datos de StatsBomb.

## 📋 Descripción

Este proyecto descarga datos de la Premier League 2017/18 desde StatsBomb (datos públicos) y crea una visualización interactiva donde puedes:

- 👀 Ver secuencias de pases en el campo de fútbol
- ⚽ Identificar qué secuencias terminaron en gol
- 🎯 Analizar shots y sus resultados
- 📊 Ver estadísticas en tiempo real
- 🎬 Reproducir automáticamente todas las secuencias

## 🚀 Inicio Rápido

### 1️⃣ Instalar dependencias

```bash
pip install pandas requests tqdm
```

### 2️⃣ Ejecutar el procesador de datos

```bash
python data_processor.py
```

Esto descargará todos los datos de StatsBomb y creará:

- `data/pass_sequences.json` - Secuencias de pases
- `data/matches.json` - Información de partidos
- `data/shots.json` - Todos los shots

⏱️ Esto toma ~2-5 minutos dependiendo de tu conexión

### 3️⃣ Abrir la visualización

1. Abre `visualization/index.html` en tu navegador
2. Selecciona un partido
3. Explora las secuencias de pases

## 🎮 Cómo Usar

### Controles

- **Partido**: Selecciona un partido para ver sus secuencias
- **Equipo**: Filtra por equipo específico
- **Filtro**:
  - _Todas las secuencias_: Todas
  - _Con Shot_: Solo secuencias que terminaron en disparo
  - _Con Gol_: Solo secuencias que resultaron en gol
  - _Sin Gol_: Secuencias que no terminaron en gol

- **▶ Reproducir**: Reproduce automáticamente todas las secuencias
- **↻ Reiniciar**: Vuelve al inicio

### Visualización del Campo

- **Líneas de pases**:
  - 🟢 Verde = Pases exitosos
  - 🔴 Rojo = Pases que llegaron a gol
  - 🟠 Naranja = Pases fallidos

- **Puntos**:
  - 🔵 Azul = Inicio de la secuencia
  - ⚪ Gris = Puntos intermedios
  - 🔴 Rojo = Último punto (antes del shot)

- **Línea punteada**: Shot (disparo)

### Estadísticas

- **Secuencias**: Total de secuencias filtradas
- **Con Shot**: Cuántas terminaron en disparo
- **Con Gol**: Cuántas resultaron en gol
- **Tasa Conversión**: % de shots que fueron goles
- **Pases Promedio**: Promedio de pases por secuencia
- **Precisión**: % de pases exitosos

## 📁 Estructura del Proyecto

```
PROYECTO_STATSBOMB/
├── main.ipynb                    # Notebook original (sin cambios)
├── data_processor.py             # Script principal de procesamiento ⭐
├── data/
│   ├── pass_sequences.json       # Secuencias de pases procesadas
│   ├── matches.json              # Info de partidos
│   └── shots.json                # Info de todos los shots
└── visualization/
    ├── index.html                # Dashboard interactivo
    ├── app.js                    # Lógica JavaScript
    └── style.css                 # Estilos
```

## 📊 Datos Disponibles

### Pass Sequences

Cada secuencia contiene:

- `id`: ID único
- `match_id`: ID del partido
- `team`: Equipo que tiene la posesión
- `passes`: Lista de pases con:
  - `player`: Jugador
  - `x, y`: Posición
  - `end_x, end_y`: Destino del pase
  - `minute, second`: Tiempo
  - `successful`: ¿Fue exitoso?
- `ended_in_shot`: ¿Terminó en disparo?
- `ended_in_goal`: ¿Resultó en gol?
- `shot`: Info del disparo (si existe)

### Matches

- `match_id`: ID único
- `home_team, away_team`: Equipos
- `home_score, away_score`: Resultado
- `match_date`: Fecha

## 🔧 Personalización

Puedes modificar `data_processor.py` para:

- Cambiar de competición:

  ```python
  COMPETITION_ID = 9   # Champions League
  SEASON_ID = 107      # 2017/18
  ```

- Diferentes temporadas (busca en el repo de StatsBomb)

## 📈 Estadísticas de Ejemplo

Para la temporada 2017/18 de Premier League (~2300 matches):

- ~500,000+ eventos totales
- ~50,000+ secuencias de pases
- ~2,000+ goles
- ~8,000+ shots
- Precisión promedio: ~80%

## ⚠️ Requisitos

- Python 3.7+
- Conexión a internet (para descargar datos)
- Navegador moderno (Chrome, Firefox, Safari, Edge)

## 🔗 Fuentes

- **StatsBomb Open Data**: https://github.com/statsbomb/open-data
- Datos públicos bajo licencia Creative Commons

## 💡 Ideas Futuras

- Agregar análisis de jugadores individuales
- Mapa de calor de posiciones
- Comparativa entre equipos
- Exportar visualizaciones como imágenes
- Análisis de presión y defensa
- Red de passes (quién pasa a quién)

## 📝 Notas

- El procesamiento inicial toma tiempo (descarga mucho datos)
- Los datos son históricos (2017/18)
- La visualización es estática pero interactiva (no simula movimiento real)
- Optimizado para desktop (funciona en mobile pero es mejor en grande)

---

**¿Preguntas?** Revisa los comentarios en el código o el script de procesamiento.

Creado con ❤️ para análisis de fútbol con datos.
