import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User2, Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react'
import ThemeToggle from '@/components/ThemeSwitchDarklight'

import { authService } from '@/services/auth'
import { useToast } from '@/components/ui/toast'
import { logger as Logger } from '@/services/core'
import { Input } from '@/components/ui/input'
import { useKeyboard } from '@/hooks/ui/keyboard'
export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { toast } = useToast()
  const isKeyboardOpen = useKeyboard();

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Appel au service d'authentification
      const authResponse = await authService.login({ username, password })

      Logger.debug('✅ Connexion réussie:', authResponse)

      // Notifier le contexte du changement d'authentification
      window.dispatchEvent(new Event('auth-changed'))

      // Redirection selon le rôle
      setTimeout(() => {
        navigate('/')
      }, 500)
    } catch (err) {
      Logger.debug('❌ Erreur de connexion:', err)

      // Vérifier si c'est une erreur de groupe non autorisé
      if (err.message === 'UNAUTHORIZED_GROUP') {
        navigate('/unauthorized')
        return
      }

      // Extraire le message d'erreur
      let errorMessage = 'Identifiants invalides'

      if (err.graphQLErrors && err.graphQLErrors.length > 0) {
        errorMessage = err.graphQLErrors[0].message
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      toast({
        title: 'Erreur de connexion',
        description: errorMessage,
        variant: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
<div
  className={`min-h-dvh bg-background text-2xl flex justify-center
  ${isKeyboardOpen ? "items-start pt-6" : "items-center"}
  px-4 sm:px-6 overflow-y-auto transition-all duration-150
`}
> {/* Boutons de thème en haut à droite */}
      <div className="fixed top-6 right-6 flex items-center gap-2 text-2xl">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-xl text-xl">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <User2 className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Pro-Win</h1>
          <p className="text-muted-foreground">Module prospection</p>
        </div>

        {/* Formulaire de connexion */}
        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Connexion</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Message d'erreur */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-xl">
                {error}
              </div>
            )}

            {/* Champ Email/Username */}
            <div>
              <label htmlFor="username" className="block font-medium text-foreground mb-2">
                Email ou nom d'utilisateur
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pl-10 py-5 text-[20px]" // Ajoute juste le padding gauche pour l'icône
                  placeholder="Email ou nom d'utilisateur"
                />
              </div>
            </div>

            {/* Champ Mot de passe */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-xl font-medium text-foreground">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none flex items-center gap-1 text-lg font-medium"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="h-5 w-5" />
                      Masquer
                    </>
                  ) : (
                    <>
                      <Eye className="h-5 w-5" />
                      Afficher
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pl-10  py-5 text-[20px]" // Ajoute juste le padding gauche pour l'icône
                  placeholder="********"
                />
              </div>
            </div>

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
