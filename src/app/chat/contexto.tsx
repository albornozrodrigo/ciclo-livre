import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { previewChatContext } from '@/ai/request-chat';
import { ContextText } from '@/components/chat/context-text';
import { AttentionNotice } from '@/components/ui/attention-notice';
import { FormScreen } from '@/components/form-screen';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

const c = ptBR.chat;

/** O resumo que vai junto com cada pergunta, montado agora (o mesmo do envio). */
export default function ChatContextScreen() {
  const db = useSQLiteContext();
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    previewChatContext(db)
      .then((ctx) => active && setText(ctx.text))
      .catch((e: unknown) => {
        log.error('chat_preview_failed', e);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [db, attempt]);
  return (
    <FormScreen title={c.contextTitle} hint={c.contextHint}>
      {failed ? (
        <AttentionNotice
          text={c.previewFailed}
          actionLabel={c.retry}
          onAction={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
        />
      ) : (
        <ContextText text={text} />
      )}
    </FormScreen>
  );
}
