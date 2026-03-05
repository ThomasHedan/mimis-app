export type Profile = {
  id: string;
  display_name: string;
};

export type Event = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  color: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  created_by: string;
  created_at: string;
};

export type Habit = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  user_id: string;
  created_at: string;
  logged_today?: boolean;
};

export type Chore = {
  id: string;
  title: string;
  done: boolean;
  done_at: string | null;
  due_date: string | null;
  assigned_to: string | null;
  priority: "low" | "medium" | "high";
  notes: string | null;
  created_by: string;
  created_at: string;
};
