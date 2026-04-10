import { X } from 'lucide-react';

export default function PrivacyPolicy({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[110] bg-white overflow-y-auto p-6 sm:p-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-gray-900">Política de Privacidade</h1>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-8 h-8 text-gray-400" />
          </button>
        </div>

        <div className="prose prose-indigo max-w-none text-gray-600 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-gray-900">1. Coleta de Informações</h2>
            <p>
              Coletamos informações básicas de identificação quando você se cadastra usando sua conta Google, 
              incluindo seu nome, e-mail e foto de perfil. Essas informações são usadas exclusivamente para 
              identificar seus lances e gerenciar sua conta no Lance Certo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">2. Uso de Dados</h2>
            <p>
              Seus dados são utilizados para processar transações de leilão, enviar notificações sobre o status 
              de seus lances e garantir a segurança da plataforma. Não compartilhamos seus dados pessoais com 
              terceiros para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">3. Segurança</h2>
            <p>
              Utilizamos o Google Firebase para armazenamento seguro de dados e autenticação. Suas informações 
              estão protegidas por protocolos de segurança de nível industrial.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">4. Seus Direitos</h2>
            <p>
              Você pode solicitar a exclusão de sua conta e de todos os dados associados a qualquer momento 
              entrando em contato com o suporte ou através das configurações do seu perfil.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">5. Contato</h2>
            <p>
              Para dúvidas sobre esta política, entre em contato através do e-mail: suporte@lancecerto.com.br
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <button 
            onClick={onClose}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md"
          >
            Entendi e Aceito
          </button>
        </div>
      </div>
    </div>
  );
}
