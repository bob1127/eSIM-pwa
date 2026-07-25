<?php
/**
 * Jeko 文章 SEO 自訂欄位（Code Snippets / WPCode 用）
 *
 * 使用方式：
 * 1. WP 後台 → Code Snippets 或 WPCode → 新增 Snippet
 * 2. 類型選「PHP Snippet」／「Run everywhere」
 * 3. 貼上本檔「全部內容」（含或不含開頭 <?php 皆可，依外掛說明）
 * 4. 啟用後，到文章編輯右側即可看到「Jeko SEO / 結構化資料」
 *
 * 欄位（REST API → post.meta）：
 * - jeko_description  SEO 描述
 * - jeko_keywords     關鍵字（逗號分隔）
 * - jeko_qa           FAQ 結構化資料（見下方格式）
 *
 * jeko_qa 建議格式（二選一）：
 *
 * 【JSON】
 * [
 *   {"question":"可以帶行動電源上飛機嗎？","answer":"可以，但需符合航空公司與民航規定…"},
 *   {"question":"台胞證要怎麼辦？","answer":"…"}
 * ]
 *
 * 【Q/A 純文字】
 * Q: 可以帶行動電源上飛機嗎？
 * A: 可以，但需符合航空公司與民航規定…
 *
 * Q: 台胞證要怎麼辦？
 * A: …
 */

if (!defined('ABSPATH')) {
	exit;
}

const JEKO_META_DESCRIPTION = 'jeko_description';
const JEKO_META_KEYWORDS    = 'jeko_keywords';
const JEKO_META_QA          = 'jeko_qa';

/**
 * 註冊 post meta，並開放 REST API（前台 Next.js 可讀）
 */
add_action('init', function () {
	$common = array(
		'type'              => 'string',
		'single'            => true,
		'show_in_rest'      => true,
		'auth_callback'     => function () {
			return current_user_can('edit_posts');
		},
	);

	register_post_meta(
		'post',
		JEKO_META_DESCRIPTION,
		array_merge(
			$common,
			array(
				'description'       => 'Jeko SEO description',
				'default'           => '',
				'sanitize_callback' => 'sanitize_textarea_field',
			)
		)
	);

	register_post_meta(
		'post',
		JEKO_META_KEYWORDS,
		array_merge(
			$common,
			array(
				'description'       => 'Jeko SEO keywords',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
			)
		)
	);

	register_post_meta(
		'post',
		JEKO_META_QA,
		array_merge(
			$common,
			array(
				'description'       => 'Jeko FAQ / QA for JSON-LD',
				'default'           => '',
				'sanitize_callback' => 'jeko_sanitize_qa_meta',
			)
		)
	);
});

/**
 * QA 允許換行與 JSON 字元
 */
function jeko_sanitize_qa_meta($value) {
	if (!is_string($value)) {
		return '';
	}
	$value = wp_check_invalid_utf8($value);
	// 保留換行，去掉危險 HTML
	$value = wp_kses($value, array());
	return $value;
}

/**
 * 文章編輯右側 Meta Box（區塊編輯器也適用）
 */
add_action('add_meta_boxes', function () {
	add_meta_box(
		'jeko_seo_meta_box',
		'Jeko SEO / 結構化資料',
		'jeko_render_seo_meta_box',
		'post',
		'side',
		'high'
	);
});

function jeko_render_seo_meta_box($post) {
	wp_nonce_field('jeko_seo_meta_save', 'jeko_seo_meta_nonce');

	$description = get_post_meta($post->ID, JEKO_META_DESCRIPTION, true);
	$keywords    = get_post_meta($post->ID, JEKO_META_KEYWORDS, true);
	$qa          = get_post_meta($post->ID, JEKO_META_QA, true);
	?>
	<p style="margin:0 0 12px;">
		<label for="jeko_description" style="font-weight:600;display:block;margin-bottom:4px;">
			description（SEO 描述）
		</label>
		<textarea
			id="jeko_description"
			name="jeko_description"
			rows="4"
			style="width:100%;"
			placeholder="建議 120–160 字，會用於 meta description / OG"
		><?php echo esc_textarea($description); ?></textarea>
	</p>

	<p style="margin:0 0 12px;">
		<label for="jeko_keywords" style="font-weight:600;display:block;margin-bottom:4px;">
			keywords（關鍵字）
		</label>
		<input
			type="text"
			id="jeko_keywords"
			name="jeko_keywords"
			value="<?php echo esc_attr($keywords); ?>"
			style="width:100%;"
			placeholder="中國旅遊,行動電源,登機規定,台胞證"
		/>
		<span style="display:block;margin-top:4px;color:#646970;font-size:12px;">
			以逗號分隔
		</span>
	</p>

	<p style="margin:0;">
		<label for="jeko_qa" style="font-weight:600;display:block;margin-bottom:4px;">
			qa（FAQ 結構化資料）
		</label>
		<textarea
			id="jeko_qa"
			name="jeko_qa"
			rows="10"
			style="width:100%;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;"
			placeholder="Q: 問題一？&#10;A: 答案一&#10;&#10;Q: 問題二？&#10;A: 答案二"
		><?php echo esc_textarea($qa); ?></textarea>
		<span style="display:block;margin-top:4px;color:#646970;font-size:12px;">
			可用 Q/A 純文字，或 JSON 陣列 [{"question":"…","answer":"…"}]
		</span>
	</p>
	<?php
}

/**
 * 儲存 Meta
 */
add_action('save_post_post', function ($post_id) {
	if (!isset($_POST['jeko_seo_meta_nonce']) ||
		!wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['jeko_seo_meta_nonce'])), 'jeko_seo_meta_save')) {
		return;
	}
	if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
		return;
	}
	if (!current_user_can('edit_post', $post_id)) {
		return;
	}

	if (isset($_POST['jeko_description'])) {
		update_post_meta(
			$post_id,
			JEKO_META_DESCRIPTION,
			sanitize_textarea_field(wp_unslash($_POST['jeko_description']))
		);
	}

	if (isset($_POST['jeko_keywords'])) {
		update_post_meta(
			$post_id,
			JEKO_META_KEYWORDS,
			sanitize_text_field(wp_unslash($_POST['jeko_keywords']))
		);
	}

	if (isset($_POST['jeko_qa'])) {
		update_post_meta(
			$post_id,
			JEKO_META_QA,
			jeko_sanitize_qa_meta(wp_unslash($_POST['jeko_qa']))
		);
	}
});
