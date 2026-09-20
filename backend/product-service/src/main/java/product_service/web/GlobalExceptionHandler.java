package product_service.web;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> fieldErrors.put(error.getField(), messageOf(error)));
        Map<String, Object> body = body(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ");
        body.put("fieldErrors", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    /**
     * Dữ liệu gửi lên không đọc được: JSON sai cú pháp, hoặc điền chữ vào ô số,
     * hoặc gửi một giá trị không có trong danh sách cho phép. Phải trả 400 chứ không phải 500.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableBody(HttpMessageNotReadableException exception) {
        return ResponseEntity.badRequest()
                .body(body(HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không đúng định dạng"));
    }

    /** Tham số trên đường dẫn hoặc query sai kiểu, ví dụ ?status=XYZ. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleWrongParamType(MethodArgumentTypeMismatchException exception) {
        return ResponseEntity.badRequest()
                .body(body(HttpStatus.BAD_REQUEST, "Giá trị của tham số '" + exception.getName() + "' không hợp lệ"));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException exception) {
        String message = exception.getReason() == null ? exception.getMessage() : exception.getReason();
        return ResponseEntity.status(exception.getStatusCode())
                .body(body(exception.getStatusCode(), message));
    }

    /**
     * Phân biệt hai tình huống: chưa đăng nhập (hoặc token hết hạn) thì trả 401 để giao diện
     * tự đăng xuất, còn đã đăng nhập mà thiếu quyền thì trả 403.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException exception) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(body(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn"));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(body(HttpStatus.FORBIDDEN, "Tài khoản của bạn không có quyền dùng chức năng này"));
    }

    private boolean isAuthenticated() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(AuthenticationException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(body(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập để tiếp tục"));
    }

    /** Hai người dùng sửa cùng một dòng dữ liệu: yêu cầu thử lại thay vì báo lỗi hệ thống. */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<Map<String, Object>> handleConcurrentUpdate(OptimisticLockingFailureException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(body(HttpStatus.CONFLICT, "Dữ liệu vừa được người khác thay đổi, vui lòng thử lại"));
    }

    /** Vi phạm ràng buộc duy nhất (email, mã giảm giá, tên danh mục...) trả 409 thay vì 500. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(body(HttpStatus.CONFLICT, "Dữ liệu đã tồn tại hoặc không hợp lệ"));
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception exception) {
        ProblemDetail detail = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        detail.setTitle("Lỗi hệ thống");
        detail.setDetail(exception.getMessage());
        return detail;
    }

    private Map<String, Object> body(org.springframework.http.HttpStatusCode status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now());
        body.put("status", status.value());
        body.put("message", message);
        return body;
    }

    private String messageOf(FieldError error) {
        return error.getDefaultMessage() == null ? "Giá trị không hợp lệ" : error.getDefaultMessage();
    }
}
