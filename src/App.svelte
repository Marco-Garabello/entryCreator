<script>
    let name = "";
    let path = "";
    let comment = "";
    let icon = "";
    let enableHide = false;

</script>

<main>
	<h1>Entry Application</h1>

    <div>
        <form>
            <label class="inline" for="idName">Name: </label>
            <input type="text" id="idName" name="name" placeholder="write app name" size="21" bind:value={name}>
            <br>
    
            <label class="inline" for="idComment">Comment: </label>
            <input type="text" id="idComment" name="comment" placeholder="write a comment" size="18" bind:value={path}>
            <br>
    
            <label class="inline" for="idPath">Path: </label>
            <input type="text" id="idPath" name="path" placeholder="write the path to the executable" size="22" bind:value={comment}>
            <br>
    
            <label class="inline" for="idIcon">Icon: </label>
            <input type="text" id="idIcon" name="icon" placeholder="write the path to the icon" size="22" bind:value={icon}>
    
            <br>
            <button type="button" name="Show" id="idShow" on:click="{() => enableHide = !enableHide}">Show result</button>
        </form>
    </div>
   

    <div class="{(enableHide && name != ""  && path != ""  && comment != "" && icon != "") ? '': 'hide'}" id="idResponse">

            <textarea name="result" id="idResult" cols="30" rows="10">
                Name={name}
                Comment={comment}
                Exec={path}
                Terminal=false
                Type=Application
                Icon={icon}
                NoDisplay=false
            </textarea>
    </div>

</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		font-size: 4em;
		font-weight: 100;
    }

    .hide {
        display: none;
    }

    .inline {
        display: inline;
    }

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>