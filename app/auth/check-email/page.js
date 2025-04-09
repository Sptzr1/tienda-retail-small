import Link from "next/link"

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Revisa tu correo electrónico</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hemos enviado un enlace de confirmación a tu correo electrónico. Por favor, haz clic en el enlace para
            verificar tu cuenta.
          </p>
        </div>

        <div className="mt-5">
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

