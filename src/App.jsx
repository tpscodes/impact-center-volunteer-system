// App.jsx — Complete routing with shared real-time sync
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useSharedTasks } from "./hooks/useSharedTasks";

// Pages
import LandingPage from "./components/LandingPage";
import ManagerLogin from "./pages/ManagerLogin";
import ManagerDashboard from "./pages/ManagerDashboard";
import { ManagerTasksScreen, CreateTaskScreen } from "./pages/ManagerTasks";
import DigitalBoard from "./pages/DigitalBoard";
import { VolunteerIdEntry, MyTask } from "./pages/ExperiencedVolunteer";
import TaskPool from "./pages/TaskPool";
import NewVolunteerTasks from "./pages/NewVolunteerTasks";

// ── Wrapper components that inject shared state ──────────────────────────────

function ManagerDashboardWrapper() {
  const navigate = useNavigate();
  const { tasks, synced, error, deleteTask, resetTasks } = useSharedTasks();
  return <ManagerDashboard tasks={tasks} synced={synced} error={error} onDeleteTask={deleteTask} onResetTasks={resetTasks} />;
}

function ManagerTasksWrapper() {
  const { tasks, synced, error, deleteTask } = useSharedTasks();
  return <ManagerTasksScreen tasks={tasks} synced={synced} error={error} onDeleteTask={deleteTask} />;
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
  const { tasks, synced, completeTask } = useSharedTasks();
  return <MyTask tasks={tasks} synced={synced} onCompleteTask={completeTask} />;
}

function NewVolunteerWrapper() {
  const { tasks, synced, error, claimTask, completeTask } = useSharedTasks();
  return <NewVolunteerTasks tasks={tasks} synced={synced} error={error} onClaimTask={claimTask} onCompleteTask={completeTask} />;
}

// ── Router ───────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Manager flow */}
        <Route path="/manager/login" element={<ManagerLogin />} />
        <Route path="/manager/dashboard" element={<ManagerDashboardWrapper />} />
        <Route path="/manager/tasks" element={<ManagerTasksWrapper />} />
        <Route path="/manager/create-task" element={<CreateTaskScreenWrapper />} />

        {/* Digital board (Prof. Amy's screen) */}
        <Route path="/board" element={<DigitalBoardWrapper />} />

        {/* Experienced volunteer flow */}
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
