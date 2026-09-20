package order_service.service;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Chặn việc tạo trùng đơn khi người mua bấm đặt hàng hai lần hoặc mạng chậm rồi thử lại.
 * Client gửi kèm header Idempotency-Key, kết quả của lần xử lý đầu được lưu lại trong Redis.
 */
@Service
public class CheckoutIdempotencyService {

    private static final String IN_PROGRESS = "IN_PROGRESS";
    private static final Duration IN_PROGRESS_TTL = Duration.ofMinutes(5);
    private static final Duration RESULT_TTL = Duration.ofDays(1);

    private final StringRedisTemplate redisTemplate;

    public CheckoutIdempotencyService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Đánh dấu bắt đầu xử lý. Trả về danh sách mã đơn nếu yêu cầu này đã được xử lý xong trước đó.
     */
    public Optional<List<Long>> begin(Long buyerId, String idempotencyKey) {
        String key = key(buyerId, idempotencyKey);
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(key, IN_PROGRESS, IN_PROGRESS_TTL);
        if (Boolean.TRUE.equals(acquired)) {
            return Optional.empty();
        }
        String existing = redisTemplate.opsForValue().get(key);
        if (existing == null) {
            return Optional.empty();
        }
        if (IN_PROGRESS.equals(existing)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Đơn hàng của bạn đang được xử lý, vui lòng đợi trong giây lát");
        }
        return Optional.of(Arrays.stream(existing.split(",")).map(Long::valueOf).toList());
    }

    public void complete(Long buyerId, String idempotencyKey, List<Long> orderIds) {
        String value = String.join(",", orderIds.stream().map(String::valueOf).toList());
        redisTemplate.opsForValue().set(key(buyerId, idempotencyKey), value, RESULT_TTL);
    }

    /** Thất bại thì bỏ dấu để người mua thử lại được. */
    public void release(Long buyerId, String idempotencyKey) {
        redisTemplate.delete(key(buyerId, idempotencyKey));
    }

    private String key(Long buyerId, String idempotencyKey) {
        return "checkout:" + buyerId + ":" + idempotencyKey;
    }
}
