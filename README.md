### Lending prototyping

![Github CI](https://github.com/dforce-network/curly-telegram/workflows/Node.js%20CI/badge.svg) [![built-with openzeppelin](https://img.shields.io/badge/built%20with-OpenZeppelin-3677FF)](https://docs.openzeppelin.com/)

##### Usage

##### Prepare

Install packages:

```
npm install
mv .example.env .env
```

*Should edit the `.env` file with your local environment variables.*

##### Compile

```
npx hardhat compile
```

##### Test

```
npx hardhat test
```

##### Deploy


```
npx hardhat run scripts/deploy.js --network kovan
```

## Kovan Contract Address(2020-12-30)

<table>
	<tr>
        <th>Contract Name</th>
    	<th>Contract Address</th>
	</tr>
	<tr>
		<td> Controller </td>
		<td> 0x0827988f0f23AAa77E4677055D80217b59279beF </td>
	</tr>
	<tr>
		<td> Interest Model </td>
		<td> 0xe2222214c86690c797e442990a0D423280E89223 </td>
	</tr>
    <tr>
		<td> Oracle </td>
		<td> 0xd0891f5f55dF4D9739FD9A774F86280914C5914d </td>
	</tr>
	<tr>
		<td> LendingData </td>
		<td> 0x57cCd442b8DC3BAb964f7078Bf33e34e1703B5c4 </td>
	</tr>
	<tr>
		<td> USDC </td>
		<td> 0x2ebE5cC3DE787C692c8458106f98B4A8392E111B </td>
	</tr>
    <tr>
		<td> iUSDC </td>
		<td> 0xfc9b44D0A1521d569C72eB8A0Db214FBb6403076 </td>
	</tr>
    <tr>
		<td> USDT </td>
		<td> 0x128c10cAD3780a541325A2f4B9E449114aD11D6b </td>
	</tr>
    <tr>
		<td> iUSDT </td>
		<td> 0xf20707546b80A6e582ffeB2C80a5e0FF196C090E </td>
	</tr>
	<tr>
		<td> USDx </td>
		<td> 0xC251A1Da17bE0Cea838f087051D0Cbf683B53054 </td>
	</tr>
	<tr>
		<td> iUSDx </td>
		<td> 0x15aaC42C25787fb45C9Ee01Df24963C0C019fF58 </td>
	</tr>
	<tr>
		<td> iETH </td>
		<td> 0xcE407FDBC15615F25B11dDc5197a1074aDFb39eA </td>
	</tr>
</table>
