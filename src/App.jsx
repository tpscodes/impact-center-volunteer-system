// App.jsx — Complete routing with shared real-time sync + multi-pantry auth
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useSharedTasks } from "./hooks/useSharedTasks";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Pages
import LandingPage from "./components/LandingPage";
import ManagerLogin from "./pages/ManagerLogin";
import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerTasksPage from "./pages/ManagerTasks";
import CreateTask from "./pages/CreateTask";
import DigitalBoard from "./pages/DigitalBoard";
import { VolunteerIdEntry, MyTask } from "./pages/ExperiencedVolunteer";
import TaskPool from "./pages/TaskPool";
import NewVolunteerTasks from "./pages/NewVolunteerTasks";
import TaskHistory from "./pages/TaskHistory";
import ManagerHistory from "./pages/ManagerHistory";
import ManagerVolunteers from "./pages/ManagerVolunteers";
import VolunteerModeSelect from "./pages/VolunteerModeSelect";
import ManagerDelivery from "./pages/ManagerDelivery";
import CreateDeliveryRoute from "./pages/CreateDeliveryRoute";
import ManagerDeliveryRoutes from "./pages/ManagerDeliveryRoutes";
import ManagerDeliveryVolunteers from "./pages/ManagerDeliveryVolunteers";
import ManagerDeliveryHistory from "./pages/ManagerDeliveryHistory";
import DeliveryTaskPool from "./pages/DeliveryTaskPool";
import DeliveryRouteDetail from "./pages/DeliveryRouteDetail";
import ManagerSettings from "./pages/ManagerSettings";
import SteveOverview from "./pages/SteveOverview";

// ── Protected route wrapper ───────────────────────────────────────────────────
// Redirects to /login if no active session; shows nothing while loading.
function RequireAuth({ children }) {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (!role) return <Navigate to="/login" replace />;
  return children;
}

// ── Wrapper components that inject shared state ──────────────────────────────

function ManagerDashboardWrapper() {
  const navigate = useNavigate();
  const { pantryId } = useAuth();
  const { tasks, synced, error, session, deleteTask, resetTasks, markTaskIncomplete, startSession, endSession, completeTask } = useSharedTasks(pantryId);
  return <ManagerDashboard tasks={tasks} synced={synced} error={error} session={session} onDeleteTask={deleteTask} onResetTasks={resetTasks} onMarkIncomplete={markTaskIncomplete} onStartSession={startSession} onEndSession={endSession} onCompleteTask={completeTask} />;
}

function CreateTaskScreenWrapper() {
  const navigate = useNavigate();
  const { pantryId } = useAuth();
  const { createTask } = useSharedTasks(pantryId);
  return (
    <CreateTask
      onBack={() => navigate("/manager-tasks")}
      onPublishAll={async (rows) => {
        await Promise.all(rows.map(row => createTask({
          item: row.item,
          action: row.action,
          source: row.source,
          destination: row.destination,
          comments: row.comments,
          priority: row.priority,
          estimatedTime: row.estimatedTime,
          assignedTo: row.assignTo,
          tags: row.tags,
        })));
        navigate("/manager-tasks");
      }}
    />
  );
}

function DigitalBoardWrapper() {
  const { pantryId } = useAuth();
  const { tasks, synced, error } = useSharedTasks(pantryId);
  return <DigitalBoard tasks={tasks} synced={synced} error={error} />;
}

function MyTaskWrapper() {
  return <MyTask />;
}

function NewVolunteerWrapper() {
  return <NewVolunteerTasks />;
}

// ── Router ───────────────────────────────────────────────────────────────────
// AuthProvider is inside BrowserRouter so it can use useNavigate for logout.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Landing */}
          <Route path="/" element={<LandingPage />} />

          {/* Login — available at both /login and legacy /manager/login */}
          <Route path="/login"          element={<ManagerLogin />} />
          <Route path="/manager/login"  element={<ManagerLogin />} />

          {/* Steve superadmin overview */}
          <Route path="/steve-overview" element={<RequireAuth><SteveOverview /></RequireAuth>} />

          {/* Manager routes — all protected */}
          <Route path="/manager/dashboard"           element={<RequireAuth><ManagerDashboardWrapper /></RequireAuth>} />
          <Route path="/manager/tasks"               element={<Navigate to="/manager-tasks" replace />} />
          <Route path="/manager/create-task"         element={<RequireAuth><CreateTaskScreenWrapper /></RequireAuth>} />
          <Route path="/manager/history"             element={<RequireAuth><TaskHistory /></RequireAuth>} />
          <Route path="/manager-tasks"               element={<RequireAuth><ManagerTasksPage /></RequireAuth>} />
          <Route path="/manager-history"             element={<RequireAuth><ManagerHistory /></RequireAuth>} />
          <Route path="/manager-volunteers"          element={<RequireAuth><ManagerVolunteers /></RequireAuth>} />
          <Route path="/manager-delivery"            element={<RequireAuth><ManagerDelivery /></RequireAuth>} />
          <Route path="/create-delivery-route"       element={<RequireAuth><CreateDeliveryRoute /></RequireAuth>} />
          <Route path="/manager-delivery-routes"     element={<RequireAuth><ManagerDeliveryRoutes /></RequireAuth>} />
          <Route path="/manager-delivery-volunteers" element={<RequireAuth><ManagerDeliveryVolunteers /></RequireAuth>} />
          <Route path="/manager-delivery-history"    element={<RequireAuth><ManagerDeliveryHistory /></RequireAuth>} />
          <Route path="/delivery-task-pool"          element={<RequireAuth><DeliveryTaskPool /></RequireAuth>} />
          <Route path="/delivery-route-detail"       element={<RequireAuth><DeliveryRouteDetail /></RequireAuth>} />
          <Route path="/manager-settings"            element={<RequireAuth><ManagerSettings /></RequireAuth>} />

          {/* Digital board (Prof. Amy's screen — no auth required) */}
          <Route path="/board" element={<DigitalBoardWrapper />} />

          {/* Volunteer flows — no auth required */}
          <Route path="/volunteer-mode-select" element={<VolunteerModeSelect />} />
          <Route path="/experienced"           element={<VolunteerIdEntry />} />
          <Route path="/experienced/tasks"     element={<TaskPool />} />
          <Route path="/experienced/mytask"    element={<MyTaskWrapper />} />
          <Route path="/new"                   element={<NewVolunteerWrapper />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
