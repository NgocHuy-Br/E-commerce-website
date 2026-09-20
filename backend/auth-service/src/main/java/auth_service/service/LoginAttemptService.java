package auth_service.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Giới hạn số lần đăng nhập sai để tránh bị dò mật khẩu.
 * Lưu trong bộ nhớ của tiến trình nên chỉ đúng khi chạy một bản auth-service;
 * nếu chạy nhiều bản thì cần chuyển sang Redis.
 */
@Service
public class LoginAttemptService {

    private static final int MAX_FAILURES = 5;
    private static final Duration WINDOW = Duration.ofMinutes(5);

    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();

    public void ensureNotBlocked(String email) {
        Deque<Instant> attempts = failures.get(email);
        if (attempts == null) {
            return;
        }
        synchronized (attempts) {
            purgeExpired(attempts);
            if (attempts.size() >= MAX_FAILURES) {
                long minutes = Math.max(1,
                        Duration.between(Instant.now(), attempts.peekFirst().plus(WINDOW)).toMinutes() + 1);
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau " + minutes + " phút");
            }
        }
    }

    public void recordFailure(String email) {
        Deque<Instant> attempts = failures.computeIfAbsent(email, key -> new ArrayDeque<>());
        synchronized (attempts) {
            purgeExpired(attempts);
            attempts.addLast(Instant.now());
        }
    }

    public void recordSuccess(String email) {
        failures.remove(email);
    }

    private void purgeExpired(Deque<Instant> attempts) {
        Instant limit = Instant.now().minus(WINDOW);
        while (!attempts.isEmpty() && attempts.peekFirst().isBefore(limit)) {
            attempts.removeFirst();
        }
    }
}
