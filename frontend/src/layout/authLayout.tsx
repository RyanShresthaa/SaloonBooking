import { Outlet } from 'react-router-dom';

/** Centers login / register / verify-email within the main shell. */
export default function AuthStack() {
  return (
    <div className="flex w-full justify-center px-4 py-6 sm:py-10">
      <Outlet />
    </div>
  );
}
