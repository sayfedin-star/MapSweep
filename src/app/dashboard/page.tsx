
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Project Overview</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Stat Cards - Placeholder */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
             <dt className="text-sm font-medium text-gray-500 truncate">Competitors Tracked</dt>
             <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
           <div className="px-4 py-5 sm:p-6">
             <dt className="text-sm font-medium text-gray-500 truncate">Total Recipes</dt>
             <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
           </div>
        </div>
      </div>
      <div className="bg-white shadow sm:rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
        <p className="mt-2 text-sm text-gray-500">No recent imports or analyses.</p>
      </div>
    </div>
  )
}
