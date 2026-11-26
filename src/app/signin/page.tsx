import Link from 'next/link';
import { signIn } from './actions';

interface SignInPageProps {
  searchParams?: {
    error?: string | string[];
    next?: string | string[];
  };
}

const messages: Record<string, string> = {
  'invalid-login': 'Feil e-post eller passord. Bruk «Glemt passord?» hvis du er usikker på passordet.',
  'email-not-confirmed': 'E-posten er ikke bekreftet. Sjekk innboksen din og bekreft før du logger inn.',
  'gmail-address': 'Obs: Gmail bruker vanligvis @gmail.com (ikke @gmail.no). Sjekk at e-posten er riktig.',
  'login-error': 'Kunne ikke logge inn. Kontroller opplysningene og prøv igjen.',
  'link-error': 'Kunne ikke sende innloggingslenken. Kontroller e-postadressen og prøv igjen.',
  'link-sent': 'Vi har sendt en innloggingslenke til e-posten din.',
};

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  const requestedNext = firstValue(searchParams?.next) || '';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '';
  const error = firstValue(searchParams?.error) || '';
  const message = messages[error];
  const isRentalFlow = next.includes('lei-en-kube');
  const backPath = next ? `/signin?next=${encodeURIComponent(next)}` : '/signin';
  const forgotPasswordHref = `/aksjer/forgot-password?back=${encodeURIComponent(backPath)}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-200">
        <div className="text-center mb-6">
          <Link href="/" className="text-orange-600 font-medium hover:underline text-sm mb-4 inline-block">
            ← Tilbake
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {isRentalFlow ? 'Logg inn for å bestille' : 'Logg inn'}
          </h1>
          {isRentalFlow && (
            <p className="text-sm text-gray-600 mt-2">
              Du må ha en bruker for å signere leieavtalen digitalt.
            </p>
          )}
        </div>

        <form action={signIn} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
            <input
              id="signin-email"
              name="email"
              type="email"
              placeholder="E-postadresse"
              autoComplete="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700 mb-1">Passord</label>
            <input
              id="signin-password"
              name="password"
              type="password"
              placeholder="Passord"
              autoComplete="current-password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
            <div className="mt-2 text-sm">
              <Link href={forgotPasswordHref} className="font-semibold text-gray-700 hover:underline">
                Glemt passord?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Logg inn
          </button>

          <button
            type="submit"
            name="intent"
            value="send-link"
            formNoValidate
            className="w-full border border-gray-300 hover:border-gray-400 text-gray-900 font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Send innloggingslenke
          </button>
        </form>

        <div className="mt-6 text-center border-t pt-6">
          <p className="text-gray-600 mb-2">Ny bruker?</p>
          <Link
            href={isRentalFlow ? `/register?next=${encodeURIComponent(next)}` : '/register'}
            className="text-orange-600 hover:text-orange-700 font-bold hover:underline"
          >
            Registrer deg her
          </Link>
        </div>

        {message && (
          <div className={`mt-4 p-4 rounded-lg text-sm ${error === 'link-sent' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
