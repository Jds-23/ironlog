import { env } from "cloudflare:workers";
import { createAuthTables } from "./setup-auth";

export async function createWorkoutTables() {
  await createAuthTables();
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS workouts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, created_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL, updated_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL, deleted_at INTEGER);",
  );
  await env.DB.exec("CREATE INDEX IF NOT EXISTS workouts_user_id_idx ON workouts(user_id);");
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS exercises (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE, name TEXT NOT NULL, \"order\" INTEGER NOT NULL, updated_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL, deleted_at INTEGER);",
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS exercises_workout_id_idx ON exercises(workout_id);",
  );
  await env.DB.exec("CREATE INDEX IF NOT EXISTS exercises_user_id_idx ON exercises(user_id);");
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS set_templates (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE, weight REAL, target_reps INTEGER, \"order\" INTEGER NOT NULL, updated_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL, deleted_at INTEGER);",
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS set_templates_exercise_id_idx ON set_templates(exercise_id);",
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS set_templates_user_id_idx ON set_templates(user_id);",
  );
}

export async function createSessionTables() {
  await createWorkoutTables();
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, workout_id TEXT REFERENCES workouts(id), workout_title TEXT NOT NULL, started_at INTEGER NOT NULL, finished_at INTEGER NOT NULL, duration_seconds INTEGER NOT NULL, updated_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL, deleted_at INTEGER);",
  );
  await env.DB.exec("CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);");
  await env.DB.exec("CREATE INDEX IF NOT EXISTS sessions_workout_id_idx ON sessions(workout_id);");
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS logged_exercises (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, exercise_id TEXT NOT NULL, name TEXT NOT NULL, \"order\" INTEGER NOT NULL, updated_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL, deleted_at INTEGER);",
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS logged_exercises_session_id_idx ON logged_exercises(session_id);",
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS logged_exercises_user_id_idx ON logged_exercises(user_id);",
  );
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS logged_sets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, logged_exercise_id TEXT NOT NULL REFERENCES logged_exercises(id) ON DELETE CASCADE, weight REAL, target_reps INTEGER, actual_reps INTEGER, done INTEGER NOT NULL DEFAULT 0, \"order\" INTEGER NOT NULL, updated_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL, deleted_at INTEGER);",
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS logged_sets_logged_exercise_id_idx ON logged_sets(logged_exercise_id);",
  );
  await env.DB.exec("CREATE INDEX IF NOT EXISTS logged_sets_user_id_idx ON logged_sets(user_id);");
}
