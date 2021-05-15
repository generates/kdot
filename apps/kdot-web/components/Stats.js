const stats = [
  { name: 'Pods', stat: '12' },
  { name: 'CPU', stat: '58.16%' },
  { name: 'Memory', stat: '24.57%' }
]

export default function Stats () {
  return (
    <dl className={`
      mt-5 grid grid-cols-1 rounded-lg bg-white dark:bg-gray-700
      overflow-hidden shadow divide-y divide-gray-200 dark:divide-gray-800
      md:grid-cols-3 md:divide-y-0 md:divide-x
    `}>
      {stats.map(item => (
        <div key={item.name} className="px-4 py-5 sm:p-6">

          <dt className={`
            text-base font-normal text-gray-900 dark:text-gray-300
          `}>
            {item.name}
          </dt>

          <dd className={`
            mt-1 flex justify-between items-baseline md:block lg:flex
          `}>
            <div className={`
              flex items-baseline text-2xl font-semibold text-indigo-600
              dark:text-blue-400
            `}>
              {item.stat}
            </div>
          </dd>

        </div>
      ))}
    </dl>
  )
}
