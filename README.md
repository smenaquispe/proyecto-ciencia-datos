# ⚽ StatsBomb Interactive Dashboard

Visualización interactiva de pases, posesión, heatmap y dominancia con React, Vite y datos de StatsBomb.

## 📋 Descripción

Este proyecto descarga datos públicos de StatsBomb y genera un dashboard donde puedes:

- 👀 Ver pases sobre el campo con una vista interactiva
- 🧊 Explorar un mapa de calor adicional
- 📊 Revisar la posesión por equipos
- 📈 Ver cómo cambia la dominancia minuto a minuto
- 🏃 Consultar un ranking de jugadores con pases efectivos minuto a minuto

## 🚀 Inicio Rápido

### 1️⃣ Instalar dependencias

```bash
pip install pandas requests tqdm
npm install
```

### 2️⃣ Ejecutar el procesador de datos

```bash
python data_processor.py
```

Esto descargará todos los datos de StatsBomb y creará:

- `data/matches.json` - Información de partidos
- `data/possessions.json` - Secuencias de posesión
- `data/passes.json` - Pases
- `data/shots.json` - Tiros

⏱️ Esto toma ~2-5 minutos dependiendo de tu conexión

### 3️⃣ Abrir la visualización

1. Ejecuta `npm run dev`
2. Abre la URL que te muestra Vite
3. Selecciona un partido y explora las vistas interactivas

## 🎮 Cómo Usar

### Controles

- **Partido**: Selecciona un partido para ver sus secuencias
- **Equipo**: Filtra por equipo específico
- **Filtro**:
  - _Todas_: Todas las secuencias
  - _Con tiro_: Solo secuencias que terminaron en disparo
  - _Con gol_: Solo secuencias que resultaron en gol
  - _Sin gol_: Secuencias que no terminaron en gol

- **Mapa de calor**: Cambia entre todo el partido filtrado y la posesión seleccionada

### Visualización del Campo

- **Líneas de pases**:
  - 🟢 Verde = Pases exitosos
  - 🔴 Rojo = Pases fallidos
  - 🔵 Azul = Primer pase de la posesión

- **Marcador de tiro**:
  - 🟠 Naranja = Tiro
  - 🔴 Rojo = Tiro que termina en gol

### Estadísticas

- **Posesiones**: Total de secuencias filtradas
- **Con tiro**: Cuántas terminaron en disparo
- **Con gol**: Cuántas resultaron en gol
- **Precisión**: % de pases efectivos
- **Promedio pases**: Promedio de pases por posesión
- **Dominancia**: Ventaja del equipo local al final del partido

## 📁 Estructura del Proyecto

```
PROYECTO_STATSBOMB/
├── main.ipynb                    # Notebook original (sin cambios)
├── data_processor.py             # Script principal de procesamiento ⭐
├── package.json                  # Vite + React + Recharts
├── vite.config.js                # Configuración de Vite
├── index.html                    # Entry point de Vite
├── src/
│   ├── main.jsx                  # Dashboard React
│   └── styles.css                # Estilos del dashboard
├── data/
│   ├── matches.json              # Info de partidos
│   ├── possessions.json          # Secuencias de posesión
│   ├── passes.json               # Pases
│   └── shots.json                # Info de todos los shots
└── visualization/
  ├── index.html                # Compatibilidad / mount alterno
  ├── app.js                    # Implementación previa
  └── style.css                 # Estilos previos
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

- Agregar comparativa entre más de dos equipos
- Exportar visualizaciones como imágenes
- Análisis de presión y defensa
- Red de pases (quién pasa a quién)

## 📝 Notas

- El procesamiento inicial toma tiempo (descarga muchos datos)
- Los datos son históricos
- El frontend usa React y Vite, así que debes iniciar el servidor para verlo
- Optimizado para desktop, pero responsivo en mobile

---

**¿Preguntas?** Revisa los comentarios en el código o el script de procesamiento.

Creado con ❤️ para análisis de fútbol con datos.
