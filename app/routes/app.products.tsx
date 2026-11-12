import { authenticate } from "app/shopify.server";
import { useEffect, useState } from "react";
import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	useFetcher,
	useLoaderData,
} from "react-router";

interface nodeType {
	id: string;
	title: string;
	status: "ACTIVE" | "ARCHIVED" | "DRAFT";
}

interface productType {
	node: nodeType;
}

interface userError {
	field: string[] | null;
	message: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const { admin } = await authenticate.admin(request);

	const response = await admin.graphql(
		`query AllProducts {
  products (first : 10){
   edges{
    node{
      id,
      title,
      status
    }
  }
  }
}
`,
	);
	const responseJson = await response.json();
	return {
		responseJson,
	};
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const { admin } = await authenticate.admin(request);
	const formData = await request.formData();

	const response = await admin.graphql(
		`mutation updateProduct ($product : ProductUpdateInput!) {
  productUpdate (product : $product) {
    product {
      id,
      title
    }
    userErrors {
      field
      message
    }
  }
}
`,
		{
			variables: {
				product: {
					id: String(formData.get("id")),
					title: String(formData.get("title")),
				},
			},
		},
	);
	const responseJson = await response.json();
	return {
		responseJson,
	};
};

function ProductRow({ product }: { product: productType }) {
	const fetcher = useFetcher<typeof action>();

	// Đổi key để gắn lại ô nhập sau mỗi lần gửi, nhờ vậy form tự trống.
	const [fieldKey, setFieldKey] = useState(0);

	const result = fetcher.data?.responseJson?.data?.productUpdate;
	const errors: userError[] = result?.userErrors ?? [];
	const isSaving = fetcher.state !== "idle";
	const saved = Boolean(result?.product) && errors.length === 0;
	const errorText = errors.map((e) => e.message).join(" · ") || undefined;

	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data) {
			setFieldKey((k) => k + 1);
		}
	}, [fetcher.state, fetcher.data]);

	const shortId = product.node.id.split("/").pop();

	return (
		<s-table-row>
			<s-table-cell>{product.node.title}</s-table-cell>
			<s-table-cell>
				<s-badge tone={product.node.status === "ACTIVE" ? "success" : "neutral"}>
					{product.node.status}
				</s-badge>
			</s-table-cell>
			<s-table-cell>{shortId}</s-table-cell>
			<s-table-cell>
				<fetcher.Form method="post">
					<input type="hidden" name="id" value={product.node.id} />
					<s-stack direction="inline" gap="small" alignItems="center">
						<s-text-field
							key={fieldKey}
							name="title"
							placeholder="Tên mới…"
							error={errorText}
						/>
						<s-button type="submit" {...(isSaving ? { loading: true } : {})}>
							Save
						</s-button>
						{/* Chỗ này luôn chiếm sẵn bề ngang để hàng không nhảy khi badge hiện ra */}
						<span style={{ display: "inline-block", minWidth: "72px" }}>
							{saved && <s-badge tone="success">Đã lưu</s-badge>}
						</span>
					</s-stack>
				</fetcher.Form>
			</s-table-cell>
		</s-table-row>
	);
}

export default function ViewProducts() {
	const { responseJson } = useLoaderData<typeof loader>();
	const products: productType[] = responseJson.data.products.edges;

	return (
		<s-page heading="Products">
			<s-section heading="Sản phẩm trong cửa hàng">
				<s-paragraph>
					Danh sách lấy từ Admin API bằng query <code>products</code>. Gõ tên mới
					rồi bấm Save để chạy mutation <code>productUpdate</code> trên đúng sản
					phẩm đó.
				</s-paragraph>

				<s-table>
					<s-table-header-row>
						<s-table-header>Tên sản phẩm</s-table-header>
						<s-table-header>Trạng thái</s-table-header>
						<s-table-header>ID</s-table-header>
						<s-table-header>Đổi tên</s-table-header>
					</s-table-header-row>
					<s-table-body>
						{products.map((product) => (
							<ProductRow key={product.node.id} product={product} />
						))}
					</s-table-body>
				</s-table>
			</s-section>
		</s-page>
	);
}
