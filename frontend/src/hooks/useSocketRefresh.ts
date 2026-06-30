import { useEffect, useRef } from "react";
import { onNotification, type NotificationPayload } from "../services/socket";

export function useSocketRefresh(
    eventTypes: string[],
    onRefresh: () => void
) {
    const savedCallback = useRef(onRefresh);
    const savedEvents = useRef(eventTypes);

    useEffect(() => { savedCallback.current = onRefresh; });
    useEffect(() => { savedEvents.current = eventTypes; });

    useEffect(() => {
        const unsub = onNotification((data: NotificationPayload) => {
            if (savedEvents.current.includes(data.type)) {
                savedCallback.current();
            }
        });
        return () => { unsub(); };
    }, []);
}
