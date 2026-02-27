import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface MasterDataItem {
  id: string;
  name: string;
}

export function useMasterData(type: "project" | "department" | "designation") {
  const [items, setItems] = useState<MasterDataItem[]>([]);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("hr_master_data")
        .select("id, name")
        .eq("type", type)
        .eq("is_active", true)
        .order("name");
      setItems(data || []);
    }
    fetch();
  }, [type]);

  return items;
}
