// App.jsx — Complete routing with shared real-time sync
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useSharedTasks } from "./hooks/useSharedTasks";

// Pages
import LandingPage from "./components/LandingPage";
import ManagerLogin from "./pages/ManagerLogin";
import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerTasksPage, { ManagerTasksScreen, CreateTaskScreen } from "./pages/ManagerTasks";
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

// ── Wrapper components that inject shared state ──────────────────────────────

function ManagerDashboardWrapper() {
  const navigate = useNavigate();
  const { tasks, synced, error, session, deleteTask, resetTasks, markTaskIncomplete, startSession, endSession, completeTask } = useSharedTasks();
  return <ManagerDashboard tasks={tasks} synced={synced} error={error} session={session} onDeleteTask={deleteTask} onResetTasks={resetTasks} onMarkIncomplete={markTaskIncomplete} onStartSession={startSession} onEndSession={endSession} onCompleteTask={completeTask} />;
}

function ManagerTasksWrapper() {
  const { tasks, synced, error, deleteTask, markTaskIncomplete } = useSharedTasks();
  return <ManagerTasksScreen tasks={tasks} synced={synced} error={error} onDeleteTask={deleteTask} onMarkIncomplete={markTaskIncomplete} />;
}

function CreateTaskScreenWrapper() {
  const navigate = useNavigate();
  const { createTask } = useSharedTasks();
  return (
    <CreateTaskScreen
      onBack={() => navigate("/manager/tasks")}
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
      }}
    />
  );
}

function DigitalBoardWrapper() {
  const { tasks, synced, error } = useSharedTasks();
  return <DigitalBoard tasks={tasks} synced={synced} error={error} />;
}

function MyTaskWrapper() {
  return <MyTask />;
}

function NewVolunteerWrapper() {
  return <NewVolunteerTasks />;
}

// ── Router ───────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Manager flow */}
        <Route path="/manager-tasks" element={<ManagerTasksPage />} />
        <Route path="/manager/login" element={<ManagerLogin />} />
        <Route path="/manager/dashboard" element={<ManagerDashboardWrapper />} />
        <Route path="/manager/tasks" element={<ManagerTasksWrapper />} />
        <Route path="/manager/create-task" element={<CreateTaskScreenWrapper />} />
        <Route path="/manager/history" element={<TaskHistory />} />
        <Route path="/manager-history" element={<ManagerHistory />} />
        <Route path="/manager-volunteers" element={<ManagerVolunteers />} />
        <Route path="/manager-delivery" element={<ManagerDelivery />} />
        <Route path="/create-delivery-route" element={<CreateDeliveryRoute />} />
        <Route path="/manager-delivery-routes" element={<ManagerDeliveryRoutes />} />
        <Route path="/manager-delivery-volunteers" element={<ManagerDeliveryVolunteers />} />
        <Route path="/manager-delivery-history" element={<ManagerDeliveryHistory />} />
        <Route path="/delivery-task-pool" element={<DeliveryTaskPool />} />
        <Route path="/delivery-route-detail" element={<DeliveryRouteDetail />} />
        <Route path="/manager-settings" element={<ManagerSettings />} />

        {/* Digital board (Prof. Amy's screen) */}
        <Route path="/board" element={<DigitalBoardWrapper />} />

        {/* Experienced volunteer flow */}
        <Route path="/volunteer-mode-select" element={<VolunteerModeSelect />} />
        <Route path="/experienced" element={<VolunteerIdEntry />} />
        <Route path="/experienced/tasks" element={<TaskPool />} />
        <Route path="/experienced/mytask" element={<MyTaskWrapper />} />

        {/* New volunteer flow */}
        <Route path="/new" element={<NewVolunteerWrapper />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
