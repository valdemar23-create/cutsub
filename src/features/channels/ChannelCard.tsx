import { memo } from 'react';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import type { Channel } from '../../domain/channel';
import type { CategoryId, ReviewedChannel, ReviewStatus } from '../../domain/review';
import { formatDate } from '../../utils/format';
import { CategorySelect, DecisionButtons, StatusBadge } from './ReviewControls';

export interface ChannelCardActions {
  onStatus: (channelId: string, status: ReviewStatus) => void;
  onCategory: (channelId: string, category: CategoryId | null) => void;
  /** D3.2: abre a confirmação para cancelar a subscrição REAL no YouTube. */
  onCancelReal?: (channel: Channel) => void;
}

interface ChannelCardProps extends ChannelCardActions {
  item: ReviewedChannel;
  suggested: CategoryId;
}

export const ChannelCard = memo(function ChannelCard({ item, suggested, onStatus, onCategory, onCancelReal }: ChannelCardProps) {
  const { channel, status, category, categoryIsManual } = item;
  const since = formatDate(channel.subscribedAt);

  return (
    <article className="channel-card" data-status={status}>
      <div className="channel-main">
        <Avatar name={channel.title} src={channel.avatarUrl} />
        <div className="channel-body">
          <div className="channel-heading">
            <h3 className="channel-title">{channel.title}</h3>
            <StatusBadge status={status} />
          </div>
          {channel.description ? (
            <p className="channel-desc">{channel.description}</p>
          ) : (
            <p className="channel-desc channel-desc--empty">Sem descrição</p>
          )}
          <div className="channel-meta">
            {since && (
              <span className="channel-since">
                <Icon name="calendar" size={14} />
                Subscrito desde {since}
              </span>
            )}
            {channel.url ? (
              <a className="channel-link" href={channel.url} target="_blank" rel="noopener noreferrer">
                Abrir no YouTube
                <Icon name="external" size={14} />
              </a>
            ) : (
              <span className="channel-link channel-link--off" title="Os canais DEMO não existem no YouTube">
                Link indisponível
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="channel-review">
        <CategorySelect
          value={category}
          isManual={categoryIsManual}
          suggested={suggested}
          onChange={(c) => onCategory(channel.id, c)}
        />
        <DecisionButtons status={status} onChange={(s) => onStatus(channel.id, s)} />
        {/* "Remover" é só uma decisão local. O cancelamento real é um botão à parte,
            só para canais já marcados "Remover", e pede sempre confirmação. */}
        {status === 'remove' && onCancelReal && channel.subscriptionId && (
          <button type="button" className="cancel-real-btn" onClick={() => onCancelReal(channel)}>
            <Icon name="trash" size={16} />
            Cancelar subscrição no YouTube
          </button>
        )}
      </div>
    </article>
  );
});
