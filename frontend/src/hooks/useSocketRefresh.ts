import { useEffect, useRef } from "react";
import { onNotification, type NotificationPayload } from "../services/socket";

export function useSocketRefresh(
    eventTypes: string[],
    onRefresh: () => void
) {
    const savedCallback = useRef(onRefresh);
    savedCallback.current = onRefresh;

    useEffect(() => {
        const unsub = onNotification((data: NotificationPayload) => {
            if (eventTypes.includes(data.type)) {
                savedCallback.current();
            }
        });
        return unsub;
    }, [eventTypes.join(",")]);
}
