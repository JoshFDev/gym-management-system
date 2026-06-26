import { useEffect, useRef } from "react";
import { onNotification, type NotificationPayload } from "../services/socket";

export function useSocketRefresh(
    eventTypes: string[],
    onRefresh: () => void
) {
    const savedCallback = useRef(onRefresh);

    useEffect(() => { savedCallback.current = onRefresh; });

    const deps = eventTypes.join(",");
    useEffect(() => {
        const unsub = onNotification((data: NotificationPayload) => {
            if (eventTypes.includes(data.type)) {
                savedCallback.current();
            }
        });
        return unsub;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deps]);
}
