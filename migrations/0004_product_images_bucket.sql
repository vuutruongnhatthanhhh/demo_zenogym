-- Bucket public để lưu ảnh sản phẩm (đã convert sang webp phía server trước
-- khi upload). Ghi/xoá object chỉ thực hiện qua service role trong API
-- routes nên không cần thêm policy cho storage.objects.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', TRUE, 5242880, ARRAY['image/webp'])
ON CONFLICT (id) DO NOTHING;
