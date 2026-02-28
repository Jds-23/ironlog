import { env } from "cloudflare:workers";
import { createAuthTables } from "./setup-auth";

export async function createWorkoutTables() {
  await createAuthTables();
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS workouts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, title TEXT NOT NULL, created_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL);",
  );
  await env.DB.exec("CREATE INDEX IF NOT EXISTS workouts_user_id_idx ON workouts(user_id);");
  await env.DB.exec(
    'CREATE TABLE IF NOT EXISTS exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE, name TEXT NOT NULL, "order" INTEGER NOT NULL);',
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS exercises_workout_id_idx ON exercises(workout_id);",
  );
  await env.DB.exec(
    'CREATE TABLE IF NOT EXISTS set_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE, weight REAL, target_reps INTEGER, "order" INTEGER NOT NULL);',
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS set_templates_exercise_id_idx ON set_templates(exercise_id);",
  );
}

export async function createSessionTables() {
  await createWorkoutTables();
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, workout_id INTEGER NOT NULL REFERENCES workouts(id), workout_title TEXT NOT NULL, started_at INTEGER NOT NULL, finished_at INTEGER NOT NULL, duration_seconds INTEGER NOT NULL);",
  );
  await env.DB.exec("CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);");
  await env.DB.exec("CREATE INDEX IF NOT EXISTS sessions_workout_id_idx ON sessions(workout_id);");
  await env.DB.exec(
    'CREATE TABLE IF NOT EXISTS logged_exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, exercise_id INTEGER NOT NULL, name TEXT NOT NULL, "order" INTEGER NOT NULL);',
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS logged_exercises_session_id_idx ON logged_exercises(session_id);",
  );
  await env.DB.exec(
    'CREATE TABLE IF NOT EXISTS logged_sets (id INTEGER PRIMARY KEY AUTOINCREMENT, logged_exercise_id INTEGER NOT NULL REFERENCES logged_exercises(id) ON DELETE CASCADE, weight REAL, target_reps INTEGER, actual_reps INTEGER, done INTEGER NOT NULL DEFAULT 0, "order" INTEGER NOT NULL);',
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS logged_sets_logged_exercise_id_idx ON logged_sets(logged_exercise_id);",
  );
}
