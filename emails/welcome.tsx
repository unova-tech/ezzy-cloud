import { Link, Text } from "@react-email/components"
import EmailLayout from "./layout"

const WelcomeEmail: React.FC<{
  formLink: string
  referralCode: string
}> = ({ formLink, referralCode }) => {
  return (
    <EmailLayout
      title="Bem-vindo à Ezzy Cloud!"
      preview="Obrigado por seu interesse! Ajude-nos a construir a melhor solução em nuvem para automações e ganhe créditos."
    >
      <h1>Bem-vindo à Ezzy Cloud!</h1>
      <Text>
        Ficamos muito felizes com seu interesse em nossa plataforma. Estamos
        trabalhando intensamente para criar uma solução em nuvem para automações
        excepcional e adaptada às suas necessidades.
      </Text>
      <Text>
        Ajude-nos a construir o produto perfeito para você e{" "}
        <strong>ganhe US$30 em créditos gratuitos</strong>! Basta preencher
        nosso formulário rápido compartilhando suas necessidades e expectativas:
      </Text>
      <Link
        href={formLink}
        className="bg-blue-500 p-3 text-white rounded font-bold"
      >
        Preencher formulárioc
      </Link>
      <Text className="mt-8">
        <strong>Ganhe ainda mais créditos compartilhando!</strong> Use seu
        código de indicação exclusivo para convidar amigos e colegas. Cada
        pessoa que se inscrever com seu código renderá créditos para ambos no
        lançamento.
      </Text>
      <Text className="text-blue-500 font-bold">
        https://ezzycloud.unova.tech/?ref={referralCode}
      </Text>
      <Text className="text-sm text-gray-500">
        Você e sua indicação ganharão US$5 em créditos cada. Limite de 2
        indicações por endereço IP e 1 por dispositivo. Máximo de US$30 em
        créditos gratuitos por usuário.
      </Text>
      <Text>
        Ficamos à disposição para qualquer dúvida. Muito obrigado por fazer
        parte desta jornada!
      </Text>
      <Text>Atenciosamente,</Text>
      <Text className="text-bold">Equipe EzzyCloud</Text>
    </EmailLayout>
  )
}

WelcomeEmail.displayName = "WelcomeEmail"
// @ts-expect-error
WelcomeEmail.defaultProps = {
  locale: "pt-br",
  formLink: "https://ezzycloud.com",
  referralCode: "ABC123XYZ"
}

export default WelcomeEmail
