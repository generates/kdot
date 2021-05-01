import StackedPage from '../components/StackedPage.js'
import Stats from '../components/Stats.js'

export default function Dashboard () {
  return (
    <StackedPage>

      <div className="mt-8">
        <Stats />
      </div>

    </StackedPage>
  )
}
