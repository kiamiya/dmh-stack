import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { listStaffMembers } from "../services/staff";
import type { StaffMemberRow } from "../services/staff";

export function useStaffMembers() {
  const [staff, setStaff] = useState<StaffMemberRow[]>([]);

  useEffect(() => {
    listStaffMembers(supabase)
      .then(setStaff)
      .catch(() => setStaff([]));
  }, []);

  return staff;
}
