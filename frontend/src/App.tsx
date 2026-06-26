import AppRouter from "./routes/AppRouter";
import { ToastProvider } from "./hooks/useToast";

function App() {
    return (
        <ToastProvider>
            <AppRouter />
        </ToastProvider>
    );
}

export default App;