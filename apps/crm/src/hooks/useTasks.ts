import { useCallback, useEffect, useState } from "react";
import type { TaskStatus } from "@dmh/types";
import { supabase } from "../lib/supabase";
import { createTask, listTasks, updateTaskStatus } from "../services/tasks";
import type { TaskInsert, TaskRow } from "../services/tasks";

export function useTasks() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return listTasks(supabase)
      .then(setTasks)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(input: TaskInsert): Promise<void> {
    await createTask(supabase, input);
    await load();
  }

  async function changeStatus(id: string, status: TaskStatus): Promise<void> {
    await updateTaskStatus(supabase, id, status);
    await load();
  }

  return { tasks, loading, error, create, changeStatus, reload: load };
}
