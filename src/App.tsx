import { NextSkyProvider } from './components/nextsky/nextsky-context'
import { Dashboard } from './components/nextsky/dashboard'
import { TooltipProvider } from './components/ui/tooltip'

function App() {
  return (
    <TooltipProvider>
      <NextSkyProvider>
        <Dashboard />
      </NextSkyProvider>
    </TooltipProvider>
  )
}

export default App