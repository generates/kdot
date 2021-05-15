import Header from './Header.js'

export default function StackedPage (props) {
  return (
    <div className={`
      flex flex-col min-h-screen bg-gray-100 dark:bg-gray-800 dark:text-gray-100
    `}>
      <div className="container mx-auto px-5">

        <Header />

        {props.children}

      </div>
    </div>
  )
}
