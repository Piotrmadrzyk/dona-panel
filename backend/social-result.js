const selected = $('Select Social Operation').first().json;
const previous = selected.post;
const response = $input.first().json;
const body = response.body || response;
const action = body.data?.createPost;
const post = body.data?.post || action?.post;
const isRead = selected.route === 'status';
const receipt = $('Record Buffer Receipt').isExecuted ? $('Record Buffer Receipt').first().json : null;
const expectedId = receipt?.buffer_post_id || previous.buffer_post_id || '';
const valid = !body.errors && !response.error && post && /^[a-zA-Z0-9_-]{8,100}$/.test(post.id || '') && post.channelId === selected.channelId && post.text === previous.caption && (!expectedId || expectedId === post.id);
let status = valid ? 'BUFFER_ACCEPTED' : 'UNKNOWN';
let link = '', publishedAt = '', error = '';
if (valid && post.status === 'sent' && post.sentAt && /^https:\/\/(?:www\.|m\.)?facebook\.com\//.test(post.externalLink || '')) {
  status = 'PUBLISHED'; link = post.externalLink; publishedAt = post.sentAt;
} else if (valid && post.status === 'error') { status = 'FAILED'; error = 'BUFFER_PUBLICATION_FAILED_REVIEW_REQUIRED'; }
else if (!valid) error = 'BUFFER_RESULT_UNCONFIRMED_DO_NOT_RETRY';
else if (post.status === 'sent') error = 'SENT_BUT_FACEBOOK_LINK_NOT_CONFIRMED';
else if (['draft','needs_approval'].includes(post.status)) error = 'BUFFER_REQUIRES_REVIEW';
// An unsuccessful status read must never erase an already confirmed outcome.
if (isRead && !valid) return [{json:{...previous,ok:false,route:'return',error:'BUFFER_STATUS_READ_FAILED',published:previous.status==='PUBLISHED'}}];
return [{ json: { ok: !!valid, route: 'result', post_key: previous.post_key, profile_key: previous.profile_key,
  status, expected_status: receipt?.status || previous.status, published: status === 'PUBLISHED', buffer_post_id: valid ? post.id : expectedId,
  published_url: link, published_at: publishedAt, last_error: error,
  claim_execution: isRead ? previous.claim_execution : String($execution.id),
  scheduled_date: isRead ? previous.scheduled_date : selected.today,
  message: status === 'PUBLISHED' ? 'Publikacja potwierdzona. Otwórz published_url.' : valid ? 'Buffer przyjął post. To jeszcze nie jest potwierdzenie publikacji na Facebooku. Sprawdź status, nie wysyłaj ponownie.' : 'Nie potwierdzono wyniku. Nie ponawiaj publikacji automatycznie.'
} }];
