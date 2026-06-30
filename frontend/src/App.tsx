import ErrorBoundary from "./components/ErrorBoundary";
import AppRouter from "./routes/AppRouter";
import { ToastProvider } from "./components/ToastProvider";

function App() {
    return (
        <ErrorBoundary>
            <ToastProvider>
                <AppRouter />
            </ToastProvider>
        </ErrorBoundary>
    );
}

export default App;