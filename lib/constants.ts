export const PLAYERS_SEED = [
  { name: 'Mattia Paratore', role: 'portiere' },
  { name: 'Federico Valente', role: 'field' },
  { name: 'Roberto Caruso', role: 'field' },
  { name: 'Sadia Omar Toure', role: 'field' },
  { name: 'Jacopo Tugnolo', role: 'field' },
  { name: 'Antonio Ballacchino', role: 'field' },
  { name: 'Andrea Stocchino', role: 'field' },
]

export const TEAMS_GROUP_1 = ['Sextacy', 'Cunico FC', 'GDB', 'Los Mantos', 'Porceddus FC']
export const TEAMS_GROUP_2 = ['Cerveza FC', 'scuadra', 'Ceres FC', 'Melanzony FC', 'Tempo Pazzo']
export const OPPONENT_TEAMS = [...TEAMS_GROUP_1, ...TEAMS_GROUP_2].filter(t => t !== 'Sextacy')

export const PHASES = [
  { value: 'girone', label: 'Girone' },
  { value: 'playoff', label: 'Playoff' },
  { value: 'quarti', label: 'Quarti di finale' },
  { value: 'semi', label: 'Semifinale' },
  { value: 'finale', label: 'Finale' },
]

export const EVENT_LABELS: Record<string, string> = {
  goal: '⚽ Goal Noi',
  goal_opp: '⚽ Goal Loro',
  yellow: '🟨 Giallo',
  red: '🟥 Rosso',
  sub: '🔄 Cambio',
  assist: '👟 Assist',
}
