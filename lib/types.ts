export type Event = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  created_by: string;
  created_at: string;
};

export type Habit = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  logged_today?: boolean;
};

export type Chore = {
  id: string;
  title: string;
  done: boolean;
  done_at: string | null;
  created_by: string;
  created_at: string;
};
