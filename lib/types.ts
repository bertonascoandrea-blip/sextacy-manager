export type MatchStatus = 'planned' | 'pending' | 'live' | 'done'
export type MatchPhase = 'girone' | 'playoff' | 'quarti' | 'semi' | 'finale'
export type EventType = 'goal' | 'goal_opp' | 'yellow' | 'red' | 'sub' | 'assist'

export interface Player {
  id: string
  name: string
  role: string
  number: number | null
  created_at: string
}

export interface Match {
  id: string
  opponent: string
  scheduled_time: string | null
  half_duration_mins: number
  score_us: number
  score_them: number
  status: MatchStatus
  phase: MatchPhase
  notes: string | null
  created_at: string
}

export interface MatchLineup {
  id: string
  match_id: string
  player_id: string
  is_captain: boolean
  is_starter: boolean
  player?: Player
}

export interface MatchEvent {
  id: string
  match_id: string
  minute: number
  type: EventType
  player_id: string | null
  player_out_id: string | null
  created_at: string
  player?: Player
  player_out?: Player
}

export interface PlayerStats {
  id: string
  player_id: string
  match_id: string
  minutes_played: number
  goals: number
  assists: number
  yellows: number
  reds: number
  player?: Player
  match?: Match
}

export interface Standing {
  id: string
  team_name: string
  group_name: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  points: number
  updated_at: string
}
