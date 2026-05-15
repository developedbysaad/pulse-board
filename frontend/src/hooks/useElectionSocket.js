import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";

export function useElectionSocket({ electionId, customUrl }) {
  const [latest, setLatest] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!electionId && !customUrl) return;
    const socket = getSocket();

    socket.emit("election:join", { electionId, customUrl });

    const onResponse = (payload) => setLatest(payload);
    const onStatus = (payload) => setStatus(payload);

    socket.on("response:new", onResponse);
    socket.on("election:status", onStatus);

    return () => {
      socket.emit("election:leave", { electionId });
      socket.off("response:new", onResponse);
      socket.off("election:status", onStatus);
    };
  }, [electionId, customUrl]);

  return { latest, status };
}
